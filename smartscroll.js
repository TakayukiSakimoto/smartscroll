(function ($) {

	///////////////
	///CONSTANTS///
	///////////////
	
	var MOUSE_EVENTS_STRING = 'mousewheel DOMMouseScroll wheel MozMousePixelScroll';

	//////////////////
	///DEPENDENCIES///
	//////////////////

	// Register lethargy as a soft dependency
	var lethargy;
	if(typeof Lethargy !== "undefined" && Lethargy !== null) {
		lethargy = new Lethargy();
	}

	///////////////
	///FUNCTIONS///
	///////////////
	
	var getWindowTop = function () {
		// jQuery uses only window.pageYOffset
		// https://github.com/jquery/jquery/blob/29370190605ed5ddf5d0371c6ad886a4a4b5e0f9/src/offset.js#L184
		return Math.max(
			// Does not work for IE8 or below
			// Alias for window.scrollY
			// https://developer.mozilla.org/en-US/docs/Web/API/Window/pageYOffset
			window.pageYOffset,

			// Does not work for IE versions below Edge
			// https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollY
			// 
			// window.scrollY,

			// Caters for quirks mode
			// Deprecated in ES5 strict mode
			// so for standards mode use document.documentElement.scrollTop instead
			// 
			window.document.body.scrollTop,

			// Caters for standards mode
			// Should be the same as `window.pageYOffset`
			window.document.documentElement.scrollTop
		);
	}

	var isInArray = function(value, array) {
	  return array.indexOf(value) > -1;
	}
	
	$.smartscroll = function(overrides) {

		/////////////
		///OPTIONS///
		/////////////

		// Replace defaults with user-specified options
		// Properties that are `null` or `undefined` are ignored - https://api.jquery.com/jquery.extend/
		var options = $.extend({}, $.smartscroll.defaults, overrides );

		// If `options.sectionSelector` is not set, use `options.sectionClass`
		if(!options.sectionSelector) {
			options.sectionSelector = "." + options.sectionClass;
		}

		// Invalidate eventEmitter if:
		if (
			// EventEmitter is not available / loaded,
			typeof EventEmitter === "undefined"
			|| EventEmitter === null
			// or the property of options.eventEmitter it is not an EventEmitter instance
			|| (options.eventEmitter && options.eventEmitter.constructor !== EventEmitter)
		) {
			options.eventEmitter = null;
		}

		///////////////////////
		///RUNTIME VARIABLES///
		///////////////////////

		// Whether jQuery is currently animating the scroll event
		var isScrolling = false;

		var sections = [];
		var sectionWrapperTop;
		var sectionWrapperBottom;

		var validBreakPoint = false;
		var belowBreakpoint = false;

		var currentHash = window.location.hash;

		// Store the current section wrapper method for later use
		var sectionWrapper = $(options.sectionWrapperSelector + ':first');

		///////////////
		///FUNCTIONS///
		///////////////
		
		// Animates the scroll to the pixel specified
		// at the speed (milisseconds) specified
		var scrollToPixel = function (pixel, speed) {
			isScrolling = true;
			if(options.eventEmitter) {
				ee.emitEvent("scrollStart", [pixel, speed]);	
			}
			$('body,html').stop(true,true).animate({
				scrollTop: pixel
			}, speed, function() {
				setTimeout(function () {
					isScrolling = false;
				}, 500);
				if(options.eventEmitter) {
					ee.emitEvent("scrollEnd", [pixel, speed]);
				}
			});
		};

		// Update the values for `sections`
		var calculateSectionBottoms = function () {
			var tmpSections = [];
			sectionWrapperTop = Math.round(
				sectionWrapper.position().top
				+ parseInt(sectionWrapper.css('paddingTop'), 10)
				+ parseInt(sectionWrapper.css('borderTopWidth'), 10)
				+ parseInt(sectionWrapper.css('marginTop'), 10));

				// We use `height()` instead of `innerHeight()` or `outerHeight()`
				// because we don't care about the padding in the sectionWrapper at the bottom
				sectionWrapperBottom = Math.round(
					sectionWrapperTop
					+ sectionWrapper.height(), 10);

			tmpSections.push(sectionWrapperTop);
			$(options.sectionSelector).each(function (i, el) {
				tmpSections.push(Math.round(
					sectionWrapperTop
					+ $(el).position().top // This will be relative to the sectionWrapper
					+ $(el).outerHeight()
				));
			});
			sections = tmpSections;
		};

		// Given the event object, determines if it's up or down,
		// or invalid according to lethargy
		var getScrollAction = function (e) {
			// Always register the action with lethargy
			if(lethargy) {
				var validScroll = lethargy.check(e);
			}
			// Do nothing if it is already scrolling
			if(!isScrolling) {
				if(lethargy) {
					if(validScroll === 1) {
			            return "up";
			        }
			        else if (validScroll === -1) {
			        	return "down";
			        }
				} else {
					if (e.originalEvent.wheelDelta > 0 || e.originalEvent.detail < 0) {
			            return "up";
			        }
			        else if (e.originalEvent.wheelDelta < 0 || e.originalEvent.detail > 0) {
			        	return "down";
			        }
				}
			}
			return false;
		}

		// Checks the slide that is occupying the position specified
		var getSectionIndexAt = function (position) {
			for (var i = 0; i < sections.length; i++) {
				if (position <= sections[i]) {
					return i;
				}
			}
			return sections.length;
		}

		// Bind scroll events and perform scrolljacking
		var bindScroll = function () {
			$(window).bind(MOUSE_EVENTS_STRING, function(e) {
				// if (options.mode === "slides") {
				// 	e.preventDefault();
				// 	e.stopPropagation();
				// }
				var scrollAction = getScrollAction(e);
				// if (options.dynamicHeight) {
				// 	calculateSectionBottoms();
				// }
				
				var windowTop = getWindowTop();
				var windowBottom = windowTop + $(window).height();
			
				// Only affect scrolling if touching the sectionWrapper area
				if (
					windowBottom > sectionWrapperTop
					&& windowTop <= sectionWrapperBottom
				) {
					e.preventDefault();
					e.stopPropagation();
      				e = e.originalEvent || e;
					if (scrollAction === "up") {
						var sectionIndexAtWindowTop = getSectionIndexAt(windowTop);
						var sectionIndexAtWindowBottom = getSectionIndexAt(windowBottom - 5);
						if (sectionIndexAtWindowTop === sectionIndexAtWindowBottom) {
							window.scrollBy(0,(-e.wheelDelta / 4));
							return;
						}
						if (sectionIndexAtWindowBottom > 0) {
							scrollToPixel(sections[sectionIndexAtWindowBottom - 1] - $(window).height(), options.animationSpeed);
						}
					}
					else if(scrollAction === "down") {
						var sectionIndexAtWindowTop = getSectionIndexAt(windowTop + 5);
						var sectionIndexAtWindowBottom = getSectionIndexAt(windowBottom + 1);
						if (sectionIndexAtWindowTop === sectionIndexAtWindowBottom) {
							window.scrollBy(0,(-e.wheelDelta / 4));
							return;
						}
						if (sectionIndexAtWindowTop <= sections.length) {
							scrollToPixel(sections[sectionIndexAtWindowTop], options.animationSpeed);
						}
					}

      				else if (scrollAction === false && !isScrolling) {
						window.scrollBy(0,(-e.wheelDelta / 8));
						return;
      				}
					// Only hijack the scroll when windowTop and windowBottom are touching different slides
					// `!==` instead of `<` caters for when `getSectionIndexAtWindowBottom` is `undefined`
					// (at the end of the area)
				}
		    });
		};

		// Remove all functions bound to mouse events
		var unbindScroll = function() {
			$(window).unbind(MOUSE_EVENTS_STRING);
		}

		// Change the hash (and also record history depending on options)
		var autoHash = function () {
			var newHash;
			if((getWindowTop() + ($(window).height() / 2)) < sectionWrapperTop) {
				newHash = options.headerHash;
			} else {
				var slideIndex = getSectionIndexAt(getWindowTop() + ($(window).height() / 2));
				if(slideIndex !== undefined) {
					newHash = $(options.sectionSelector + ':nth-of-type(' + (slideIndex + 1) + ')').data('hash');
				}
			}
			if(typeof newHash === 'undefined' || !(window.location.hash === ('#' + newHash))) {
				if(typeof newHash === 'undefined') {
					newHash = options.headerHash;
				}
				if(!options.keepHistory) {
					window.location.replace(window.location.href.split('#')[0] + '#' + newHash);
				} else {
					window.location.hash = newHash;
				}
			}
		}

		///////////////////
		///INITIAL SETUP///
		///////////////////

		sectionWrapper.css({
			'position': 'relative'
		});
		
		// Need to wait until content and CSS has been parsed
		// So the height is accurate
		setTimeout(function () {
			calculateSectionBottoms();

			// autoHash

			if(options.autoHash) {

				if(options.eventEmitter !== null && !options.hashContinuousUpdate) {
					ee.addListener('scrollEnd', autoHash);
				}
				// Fallback with binding scroll events.
				// Many scroll events are fired and so is very resource-intensive
				else {
					$(window).bind('scroll', autoHash);
				}
			}

			// Scroll to hash
		
			if(options.initialScroll && currentHash.length > 0) {
				// Remove the '#' from the hash and use jQuery to check
				// if an element exists with that hash in the 'data-hash' attribute
				var matchedObject = $('[data-hash="' + currentHash.substr(1) + '"]');
				// If there is a matched element, scroll to the first element at time 0 (immediately)
				if(matchedObject.length > 0) {
					scrollToPixel(matchedObject[0].offsetTop + sectionWrapperTop, 0);
				}
			}
		}, 50);

		$(window).bind('resize', calculateSectionBottoms);

		// Breakpoint

		// If options.breakpoint is a valid value,
		// set this.validBreakPoint to true
		if(options.breakpoint !== null && options.breakpoint === parseInt(options.breakpoint, 10) && options.breakpoint > 0) {
			validBreakPoint = true;
		}

		// Mode
		
		// If the mode is set to vp (viewpoint),
		// make the height of each section the same as the viewport
		if (options.mode == "vp") {
			// IE8 does not support viewport
			// http://caniuse.com/#feat=viewport-units
			if(options.ie8) {
				var resizeToVP = function() {
					$(options.sectionSelector).css({
						"height": $(window).height()
					});
				};

				// Initial resizing on load
				resizeToVP();

				// Run resizeToVP whenever the window resizes
				$(window).bind('resize', resizeToVP);
			}
			// Use viewport to avoid binding to resize events
			else {
				$(options.sectionSelector).css({
					"height": "100vh"
				});
			}
		}

		// Scrolljacking
		if(options.sectionScroll) {

			// If the breakpoint option is set
			if(validBreakPoint) {

				// Run the following whenever the window is resized
				$(window).bind('resize', function(e){
					// If the window width is below the breakpoint,
					// Unbind scroll
					if($(window).width() < options.breakpoint) {
						// Only unbind once (minimize resource usage)
						if(!belowBreakpoint) {
							unbindScroll();
							// Set belowBreakpoint to true to prevent further unbinding events
							belowBreakpoint = true;
							return false;
						}
					}
					// If the screen width is currently equal to or above the breakpoint
					else {
						// Bind scroll only if it's not bound already
						if(belowBreakpoint) {
							bindScroll();
							belowBreakpoint = false;
						}
					}
				});
			}
			bindScroll();
		}
	}

	// Set default options
	$.smartscroll.defaults = {
		animationSpeed: 700,
		autoHash: true,
		breakpoint: null,
		initialScroll: true,
		headerHash: "header",
		keepHistory: false,
		mode: "vp", // "vp", "set", "slides"
		sectionClass: "section",
		sectionSelector: null,
		sectionScroll: true,
		sectionWrapperSelector: ".section-wrapper",
		eventEmitter: null,
		dynamicHeight: false,
		ie8: false,
		hashContinuousUpdate: true
	}
}(jQuery));