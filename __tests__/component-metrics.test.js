import componentmetrics from '../component-metrics';

test('Invalid config throws error', () => {
    var invalidConfig = { foo: "bar" };
    expect(() => {
	var cm = componentmetrics(invalidConfig);
    }).toThrow();
});

test('Basic config functions', () => {
    var validConfig = { valid_props: ["user_id"] };
    var metrics = new componentmetrics(validConfig);
    expect(metrics._validProps).toEqual(expect.arrayContaining(["user_id"]));
});


describe("Ordinary event (finalized on any subsequent event)", () => {

    var validConfig = { valid_props: ["user_id"] };
    var metrics = new componentmetrics(validConfig);

    metrics.registerEvent({
	user_id: 44,
	interaction_meaning: "read",
	interaction_gesture: "view",
	page: "feed",
	component: "feed_card"
    });

    const unfinalized = metrics._getUnfinalizedEvents();
    const finalized = metrics._getFinalizedEvents();

    test('should not be finalized initially', () => {
	expect(Object.keys(unfinalized).length).toBe(1);
	expect(finalized.length).toBe(0);
    });

    metrics.registerEvent({
	user_id: 44,
	interaction_meaning: "navigate",
	interaction_gesture: "tap",
	page: "feed",
	component: "buttonA"
    });

    const unfinalized2 = metrics._getUnfinalizedEvents();
    const finalized2 = metrics._getFinalizedEvents();
    test('should finalize on any new event', () => {
	expect(finalized2.length).toBe(1);
	expect(Object.keys(unfinalized2).length).toBe(1);
    });
});

describe("Immediately finalized event", () => {
    var validConfig = { valid_props: ["user_id"] };
    var metrics = new componentmetrics(validConfig);

    metrics.registerEvent({
	user_id: 44,
	interaction_meaning: "read",
	interaction_gesture: "view",
	page: "feed",
	component: "feed_card"
    }, { finalization_mode: "immediate"});

    const unfinalized = metrics._getUnfinalizedEvents();
    const finalized = metrics._getFinalizedEvents();

    test('should be finalized initially', () => {
	expect(Object.keys(unfinalized).length).toBe(0);
	expect(finalized.length).toBe(1);
    });
});


describe("Component event", () => {
    test('should finalize on page change', () => {
	var validConfig = { valid_props: ["user_id"] };
	var metrics = new componentmetrics(validConfig);
	metrics.registerEvent({
	    user_id: 44,
	    interaction_meaning: "read",
	    interaction_gesture: "view",
	    page: "home",
	    component: "card"
	}, { finalization_mode: "next_event_same_component" });
	metrics.registerEvent({
	    user_id: 44,
	    interaction_meaning: "read",
	    interaction_gesture: "view",
	    page: "profile"
	});
	const unfinalized = metrics._getUnfinalizedEvents();
	const finalized = metrics._getFinalizedEvents();
	expect(finalized.length).toBe(1);
	expect(Object.keys(unfinalized).length).toBe(1);
    });

    test('should finalize on another action on same component', () => {
	var validConfig = { valid_props: ["user_id"] };
	var metrics = new componentmetrics(validConfig);
	metrics.registerEvent({
	    user_id: 44,
	    interaction_meaning: "read",
	    interaction_gesture: "view",
	    page: "feed0",
	    component: "feed_card0"
	}, { finalization_mode: "next_event_same_component" });
	metrics.registerEvent({
	    user_id: 44,
	    interaction_meaning: "upvote",
	    interaction_gesture: "tap",
	    page: "feed0",
	    component: "feed_card0"
	});
	const unfinalized = metrics._getUnfinalizedEvents();
	const finalized = metrics._getFinalizedEvents();
	expect(Object.keys(unfinalized).length).toBe(1);
	expect(finalized.length).toBe(1);
    });

    test('should _not_ finalize on an action on a different component', () => {
	var validConfig = { valid_props: ["user_id"] };
	var metrics = new componentmetrics(validConfig);
	metrics.registerEvent({
	    user_id: 44,
	    interaction_meaning: "read",
	    interaction_gesture: "view",
	    page: "feed",
	    component: "feed_card"
	}, { finalization_mode: "next_event_same_component" });
	metrics.registerEvent({
	    user_id: 44,
	    interaction_meaning: "read",
	    interaction_gesture: "view",
	    page: "feed",
	    component: "profile_image"
	});
	const unfinalized = metrics._getUnfinalizedEvents();
	const finalized = metrics._getFinalizedEvents();
	expect(finalized.length).toBe(0);
	expect(Object.keys(unfinalized).length).toBe(2);
    });
});


describe("Page event", () => {
    test('should finalize on page change', () => {
	var validConfig = { valid_props: ["user_id"] };
	var metrics = new componentmetrics(validConfig);
	metrics.registerEvent({
	    user_id: 44,
	    interaction_meaning: "read",
	    interaction_gesture: "view",
	    page: "home",
	    component: "card"
	}, { finalization_mode: "page_change" });
	metrics.registerEvent({
	    user_id: 44,
	    interaction_meaning: "read",
	    interaction_gesture: "view",
	    page: "profile"
	});
	const unfinalized = metrics._getUnfinalizedEvents();
	const finalized = metrics._getFinalizedEvents();
	expect(finalized.length).toBe(1);
	expect(Object.keys(unfinalized).length).toBe(1);
    });

    test('should _not_ finalize on an action on same page', () => {
	var validConfig = { valid_props: ["user_id"] };
	var metrics = new componentmetrics(validConfig);
	metrics.registerEvent({
	    user_id: 44,
	    interaction_meaning: "read",
	    interaction_gesture: "view",
	    page: "feed",
	    component: "feed_card"
	}, { finalization_mode: "next_event_same_component" });
	metrics.registerEvent({
	    user_id: 44,
	    interaction_meaning: "read",
	    interaction_gesture: "view",
	    page: "feed",
	    component: "profile_image"
	});
	const unfinalized = metrics._getUnfinalizedEvents();
	const finalized = metrics._getFinalizedEvents();
	expect(finalized.length).toBe(0);
	expect(Object.keys(unfinalized).length).toBe(2);
    });
});


describe("Event system", () => {
    test('flushes finalized events correctly', () => {
	var validConfig = { valid_props: ["user_id"] };
	var metrics = new componentmetrics(validConfig);
	metrics.registerEvent({
	    user_id: 44,
	    interaction_meaning: "read",
	    interaction_gesture: "view",
	    page: "home",
	    component: "card"
	}, { finalization_mode: "page_change" });

	metrics.registerEvent({
	    user_id: 44,
	    interaction_meaning: "read",
	    interaction_gesture: "view",
	    page: "profile"
	});
	const unfinalized = metrics._getUnfinalizedEvents();
	const finalized = metrics._getFinalizedEvents();
	expect(finalized.length).toBe(1);
	expect(Object.keys(unfinalized).length).toBe(1);


	var called = false;
	var called_number_events = 0;
	var callback = function(events){
	    called = true;
	    called_number_events = events.length;
	};
	metrics.registerFinalizedEventsCallback(callback);

	var events = metrics._flushFinalizedEvents();
	expect(events.length).toBe(1);
	var finalized2 = metrics._getFinalizedEvents();
	expect(finalized2.length).toBe(0);

	expect(called).toBe(true);
	expect(called_number_events).toBe(1);
    });
});

describe("Event timing", () => {
    test('to correctly measure duration', () => {
	var validConfig = { valid_props: ["user_id"] };
	var metrics = new componentmetrics(validConfig);
	metrics.registerEvent({
	    user_id: 44,
	    interaction_meaning: "read",
	    interaction_gesture: "view",
	    page: "home",
	    component: "card"
	}, { finalization_mode: "page_change" });

	// Introduce artificial delay for timing purposes
	var j = 2;
	for(var i = 0; i < 10000000; i++){
	    j = j * i;
	}

	metrics.registerEvent({
	    user_id: 44,
	    interaction_meaning: "read",
	    interaction_gesture: "view",
	    page: "profile"
	});

	var events = metrics._flushFinalizedEvents();
	expect(events.length).toBe(1);
	expect(events[0].duration).toBeGreaterThan(1);
	expect(events[0].duration).toBeLessThan(100);
    });
});