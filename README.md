# Collect and report UI events that have
  * UI Context: Events have associated pages and components
  * Temporal Context: Events report what happens before (previous_page) and after (next_page)
                        as well as interaction duration when applicable.

## Config format
```
    {
      valid_props: [ ... additional properties allowed to be attached to events ... ]
    }
```

## Example usage
```
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
```


## Event Finalization
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
          "next_event_same_component"   // Finalizes on any event with same component
	                                // OR a page change.
        //You can also provide a custom function to determine whether or not an event should be finalized
        (TODO) should_finalize_event: function(unfinalized_event, new_event){ return true/false; }
     });

## TODO
  * Event finalization timeouts
  * Custom function to determine event finalization
*/
