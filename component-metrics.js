/*
  Module that collects and reports UI events that have
    * UI Context: Events have associated pages and components
    * Temporal Context: Events report what happens before (previous_page) and after (next_page)
                        as well as interaction duration when applicable.

  Config format:
    {
      valid_props: [ ... additional properties allowed to be attached to events ... ]
    }

  Example usage:
    metrics = new FrontendMetrics({ valid_props: ["user_id"] });
    metrics.registerFinalizedEventsCallback((events) => console.log("Some finalized events: ", events));
    metrics.run();

    metrics.registerEvent({
      user_id: 44,
      interaction_meaning: "read",
      interaction_gesture: "view",
      page: "feed",
      component: "feed_card"
    });

  # TODO: Event finalization timeouts

  The above event's duration will be the time until any other event.
  To change this finalization behavior, an optional config can be passed with a registered event:
    metrics.registerEvent({
      interaction_meaning: "read",
      ...
     }, {
        finalization_mode:
	  "immediate"  | //Finalizes immediately
	  "next_event" | //Finalizes when any other event is registered
	  "page_change" | // Finalizes on page change
          "next_event_same_component" | // Finalizes on any event with same component
	                                // OR a page change.
        //You can also provide a custom function to determine whether or not an event should be finalized
        (TODO) should_finalize_event: function(unfinalized_event, new_event){ return true/false; }
     });
*/

const FINALIZE_IMMEDIATE = "immediate";
const FINALIZE_NEXT_EVENT = "next_event";
const FINALIZE_PAGE_CHANGE = "page_change";
const FINALIZE_NEXT_EVENT_SAME_COMPONENT = "next_event_same_component";

const FINALIZATION_MODES = [FINALIZE_IMMEDIATE,
    FINALIZE_NEXT_EVENT,
    FINALIZE_PAGE_CHANGE,
    FINALIZE_NEXT_EVENT_SAME_COMPONENT];

export default class ComponentMetrics {

    constructor(config){
	// Flush finalized events to registered callbacks every 10 seconds
	this.flushInterval = 10 * 1000;

	// Finalized events will be passed to these callbacks when flushed
	this.finalizedEventsCallbacks = [];

	// Provides ordered IDs to events
	this.eventCount = 0;

	// Last event registered
	this.lastEvent = null;

	// Page of last event
	this.lastPage = "";

	// Component of last event
	this.lastComponent = "";

	// Map of event IDs to unfinalized events
	this.unfinalizedEvents = {};

	// List of finalized events that have yet to be flushed.
	this.finalizedEvents = [];

	// Hierarchical event storage for efficient contextual lookup
	// e.g.) What was the last event for the Home screen scroll component?
	// Structure:
	// {
	//   "pages": {
	//     "Home": {
	//        "ComponentA": {
	//           "unfinalizedEvents": [event42, event55, ...],
	//           "lastEvent": event77
	//     }
	//   }
	// }
	//
	this.events = {
	    pages: {}
	};

	this._builtinProps = [
	    "represented_object_type",
	    "represented_object_id",
	    "interaction_meaning",
	    "interaction_gesture",
	    "interaction_duration",
	    "page",
	    "component",
	    "_finalization_mode"
	];

	this._validateConfig(config);
	this._validProps = config.valid_props;
    }


    _validateConfig(config){
	var requiredProps = ["valid_props"];
	var optionalProps = []; //TODO: flushInterval
	for(var k of requiredProps){
	    if(!(k in config)){
		throw "Config missing required property " + k;
	    }
	}
    }

    _validateEvent(event){
	for(var key in event){
	    if(-1 === this._builtinProps.indexOf(key) &&
	       -1 === this._validProps.indexOf(key)){
		   console.error("Event has invalid property: ", key, event);
		   throw "Event has invalid property: " + key;
	    }
	}
	if(FINALIZATION_MODES.indexOf(event._finalization_mode) === -1){
	    console.error("Event has invalid finalization mode: ", event);
	    throw "Invalid finalization mode " + event._finalization_mode;
	}
    }

    // Finalizes the given event.
    //  - Stores references to the newEvent that caused the finalization
    _finalizeEvent(event, newEvent){
	//Remove from unfinalizedEvents ID map
	delete this.unfinalizedEvents[event._event_id];

	//Remove from hierarchical storage
	if(this.events.pages[event.page] &&
	    this.events.pages[event.page][event.component]){
	    var newEventList = [];
	    for(var compevent of this.events.pages[event.page][event.component].unfinalizedEvents){
		if(compevent._event_id !== event._event_id){
		    newEventList.push(compevent);
		}
	    }
	    this.events.pages[event.page][event.component].unfinalizedEvents = newEventList;
	}

	//Set next properties on event
	event.next_page = newEvent.page;
	event.next_component = newEvent.component;
	event._finalized = true;
	event.duration = event.duration || newEvent.time - event.time;

	//Add to finalizedEvents list
	this.finalizedEvents.push(event);
    }

    // Finalizes any events tied to other pages (nav change)
    _finalizeNavChangeEvents(event){
	for(var page in this.events.pages){
	    if(page === event.page){
		continue;
	    }
	    for(var component in this.events.pages[page]){
		this._finalizeComponentEvents(event, page, component, [
		    FINALIZE_NEXT_EVENT_SAME_COMPONENT,
		    FINALIZE_PAGE_CHANGE
		]);
	    }
	}
    }

    // Finalizes all events of a given type associated with a given page and component
    _finalizeComponentEvents(event, page, component, eventTypes){
	if(this.events.pages[page] && this.events.pages[page][component]){
	    this.events.pages[page][component].unfinalizedEvents.filter(
		(x) => eventTypes.indexOf(x._finalization_mode) !== -1).map(
		(e) => this._finalizeEvent(e, event));
	}
    }

    // Finalizes events as necessary
    _finalizePreviousEvents(event){
	this._finalizeNavChangeEvents(event);
	this._finalizeComponentEvents(event, event.page, event.component, [FINALIZE_NEXT_EVENT_SAME_COMPONENT]);
	if(this.lastEvent && this.lastEvent._finalization_mode === FINALIZE_NEXT_EVENT){
	    this._finalizeEvent(this.lastEvent, event);
	}
    }

    // Augment event with ID, timestamp, and references to previous event
    _augmentEvent(event){
	event._event_id = this.eventCount++;
	event.time = +new Date();
	if(this.lastEvent){
	    event.lastEventId = this.lastEvent._event_id;
	    event.previous_page = this.lastEvent.page;
	    event.previous_component = this.lastEvent.component;
	}
	return event;
    }

    // Store event in hierarchical storage
    // Update references to lastEvent, lastPage and lastComponent
    _storeEvent(event){
	this.lastPage = event.page;
	this.lastComponent = event.component;
	if(!this.events.pages[event.page]){
	    this.events.pages[event.page] = {};
	}
	if(!this.events.pages[event.page][event.component]){
	    this.events.pages[event.page][event.component] = {
		unfinalizedEvents: [],
		lastEvent: null
	    };
	}
	if(event._finalization_mode !== FINALIZE_IMMEDIATE){
	    this.unfinalizedEvents[event._event_id] = event;
	    this.events.pages[event.page][event.component].unfinalizedEvents.push(event);
	}
	this.events.pages[event.page][event.component].lastEvent = event;
	this.lastEvent = event;
    }

    _flushFinalizedEvents(){
	var events = this.finalizedEvents.slice();
	for(var callback of this.finalizedEventsCallbacks){
	    callback(this.finalizedEvents);
	}
	this.finalizedEvents = [];
	return events;
    }

    _getFinalizedEvents(){
	return this.finalizedEvents.slice();
    }

    _getUnfinalizedEvents(){
	return { ...this.unfinalizedEvents };
    }

    /* Public interface */

    // Register a callback that will be invoked with a list of
    // flushed finalized events
    registerFinalizedEventsCallback(callback){
	this.finalizedEventsCallbacks.push(callback);
    }

    // Register an event with an (optional) given event config
    // Config format:
    // { finalization_mode: immediate | next_event | next_page | next_event_same_component }
    registerEvent(event, config){
	config = config || {};

	event._finalization_mode = config.finalization_mode;
	if(!event._finalization_mode){
	    event._finalization_mode = FINALIZE_NEXT_EVENT;
	}

	this._validateEvent(event);
	event = this._augmentEvent(event);
	if(event._finalization_mode === FINALIZE_IMMEDIATE){
	    this._finalizeEvent(event, {page: "", component: "", _event_id: -1, time: +new Date()});
	}

	this._finalizePreviousEvents(event);
	this._storeEvent(event);
    }

    // Periodically flush finalized events to provided callbacks
    run(){
	setInterval(this._flushFinalizedEvents.bind(this), this.flushInterval);
    }
}
