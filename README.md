# Component-Metrics

## Collect and report UI events that have
  * UI Context: Events have associated pages and components
  * Temporal Context: Events report what happens before (previous_page) and after (next_page)
  * Inferred duration: Events have automatically calculated duration spanning from when they're registered to when they get finalized.

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

## Event Structure
By default, events require the following properties:
```
{
  page: "page_name",
  component: "component_name"
}
```

Additionally, some common optional properties are supported:
```
{
  interaction_meaning: "upvote",
  interaction_gesture: "tap",
  represented_object_type: "user_profile",
  represented_object_id: 44
}
```

After processing, events will be augmented with the following properties:
```
{
  duration: 273,
  _event_id: 50601,
  _event_time: 1709035832,
}
```


## Event Finalization
  The above event's duration will be the time until any other event.
  To change this finalization behavior, an optional config can be passed with a registered event:
```
const eventConfig = {
    finalization_mode:
      "immediate"  | //Finalizes immediately
      "next_event" | //Finalizes when any other event is registered
      "page_change" | // Finalizes on page change
      "next_event_same_component"   // Finalizes on any event with same component
                                    // OR a page change.
     };
metrics.registerEvent({
      interaction_meaning: "read",
      ...
      }, eventConfig);
```

## TODO
  * Event finalization timeouts
  * Custom function to determine event finalization
