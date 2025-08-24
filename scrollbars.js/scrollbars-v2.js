   function require(x, msg) {
        if (!x) {
            throw new TypeError(msg || 'requirement falsy: '+x);
        }
    }

    function whenInsertedTo(rootNode, element, callbackScope, callback) {

        require( rootNode instanceof Node , 'rootNode must be a DOM Node');
        require( element instanceof Node , 'element must be a DOM Node');
        require( typeof callback === 'function' , 'callback must be a function');

        // Check if element is already in the DOM
        if (rootNode.contains(element)) {
            callback(element);
            return;
        }

        // Create MutationObserver
        const observer = new MutationObserver((mutations, observer) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    for (let node of mutation.addedNodes) {
                        if (node === element) {
                            // observer.disconnect();
                            callback.call(callbackScope || null, element);
                            observer.disconnect();
                            break;
                        }
                    }
                }
            });
        });

        // Start observing
        observer.observe(rootNode, {
            childList: true,
            subtree: true
        });
    }

    class StyleSheet {
        constructor() {
            this.stylesheet = document.createElement('style');
            this.stylesheet.type = 'text/css';
            this.stylesheet.className = 'instance-scrollable';
            this.rules = {};
            // Set jQuery-compatible properties
            this[0] = this.stylesheet;
            this.length = 1;
        }

        addRule(selector, styles) {
            let styleString;

            if (typeof styles === 'string') { styleString = styles.trim(); } else 
            if (typeof styles === 'object' && styles) {
                styleString = Object.entries(styles)
                .map(([key, value]) => {
                    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
                    const cssValue = typeof value === 'number' && cssKey !== 'z-index' ? `${value}px` : value;
                    return `${cssKey}: ${cssValue};`;
                })
                .join(' ');
            } else {
                return console.warn(`Invalid styles for selector "${selector}"`), this;
            }

            // Store rule in rules object
            this.rules[selector] = styleString;

            // Update stylesheet content with double newlines
            const cssText = Object.entries(this.rules)
            .map(([sel, style]) => `${sel} { ${style} }`)
            .join('\n\n');

            this.stylesheet.textContent = cssText;
            return this;
        }

        appendToDocument() {
            const appendStylesheet = () => {
            if (document.head) {
                document.head.appendChild(this.stylesheet);
                console.log('Stylesheet appended to document.head');
            } else {
                console.error('document.head not found');
            }
            };

            if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', appendStylesheet);
            } else {
            appendStylesheet();
            }
            return this;
        }
    }

    
    class Scrollbar {

        static namespace = 'scrollbar';
        static UID = 0;
        static list = [];
        static debug = false;

        constructor(O) {

            O = O || {};
            require( Object(O) === O , 'Options must be object-like.');
            require( !(O.vertical && O.horizontal) , 'Overlapping scrollbar axes: vertical, horizontal');

            let vertical = !!O.vertical;
            let horizontal = !!O.horizontal;

            if (!vertical && !horizontal) {
                vertical = true;
                if (Scrollbar.debug) {
                    console.warn('Implicit axis override: using [vertical: true]');
                }
            }

            this[0] = null;
            this.length = 0;
            this.instance = this;

            this.options = {};
            this.vertical = vertical; // booleans for easier analysis.
            this.horizontal = horizontal;
            this.axis = vertical ? 'vertical' : 'horizontal'; // ensuring axis is always one of two values.

            this.controls = O.controls;
            this.element = null;
            this.id = O.id || null;

            this.track = null;
            this.thumb = null;
            this.$track = null;
            this.$thumb = null;

            this.scrollTarget = null;
            this.scrollContainer = null;
            this.proxifyScrolling = null; // determines whether we animate scrollTarget or scrollTarget's child elements
            this.stylesheet = null;
            this.rules = null;

            this.init();
        }
        init() {
            this.createStyleSheet();
            this.createWidget();
            this.assignEventHandlers();
        }

        appendTo(destination) {
            this.$track.appendTo(destination);
        }

        push(element) {
            this.length >>>= 0;
            this[this.length++] = element;
        }

        createStyleSheet() {
            // One-time event to populate the stylesheet
            if (Scrollbar.UID) {
                return console.log('Stylesheet already created, skipping.'), this.styleSheet;
            }
            Scrollbar.UID++;

            // Create stylesheet
            this.styleSheet = new StyleSheet();
            this.styleSheet.appendToDocument();

            // Add simplified CSS rules
            return this.styleSheet
                .addRule('[scrollable][vertical]', { overflowY: 'hidden' })
                .addRule('[scrollable][horizontal]', { overflowX: 'hidden' })
                .addRule('.scrollbar[horizontal][vertical]', { border: '2px solid red' })
                .addRule('.scrollbar[horizontal][vertical]::before', { content: '"SCROLLBAR AXIS OVERLAPPING"', color: 'red' })
                .addRule('.scrollbar', {
                    display: 'none',
                    background: 'transparent',
                    position: 'absolute',
                    zIndex: 100,
                    pointerEvents: 'none'
                })
                .addRule('.scrollbar[vertical]', { right: 0, top: 0, height: '100%', width: 11 })
                .addRule('.scrollbar[horizontal]', { left: 0, bottom: 0, width: '100%', height: 11 })
                .addRule('.scrollbar [thumb]', {
                    position: 'absolute',
                    display: 'inline-block',
                    background: 'transparent',
                    cursor: 'pointer',
                    borderRadius: '5px',
                    pointerEvents: 'initial',
                    zIndex: 1
                })
                .addRule('.scrollbar[vertical] [thumb]', { top: 0, right: 0, height: '15%', width: '100%' })
                .addRule('.scrollbar[horizontal] [thumb]', { left: 0, bottom: 0, width: '15%', height: 11 })
                .addRule('.scrollbar [thumb]::before', {
                    content: '""',
                    position: 'absolute',
                    borderRadius: 'inherit',
                    display: 'inline-block',
                    transition: 'all 0.15s linear',
                    willChange: 'width, height, background',
                    boxShadow: '0 0 1px 1px #000'
                })
                .addRule('.scrollbar[vertical] [thumb]::before', {
                    height: '100%',
                    width: 1,
                    right: 0,
                    top: 0,
                    background: 'linear-gradient(#778, #556, #778)'
                })
                .addRule('.scrollbar[vertical] [thumb].active::before', {
                    width: '100%',
                    background: 'linear-gradient(45deg, #889, #556, #889)',
                    zIndex: 3
                })
                .addRule('.scrollbar[horizontal] [thumb]::before', {
                    width: '100%',
                    height: 1,
                    left: 0,
                    top: 2,
                    background: 'linear-gradient(45deg, #778, #556, #778)'
                })
                .addRule('.scrollbar[horizontal] [thumb].active::before', {
                    height: 'calc(100% - 1px)',
                    background: 'linear-gradient(45deg, #889, #556, #889)'
                });
        }

        
        createWidget() {

            let track = document.createElement('div'); // $('<div class = 'scrollbar' vertical controls = ''><span thumb data-thumb></span></div>')
            let thumb = document.createElement('span');
            let id = this.id;

            if (id) { 
                track.setAttribute('id', id);
            }
            
            track.className = Scrollbar.namespace;
            track.instance = this;

            track.setAttribute(this.axis, '');
            track.appendChild(thumb);
            
            thumb.setAttribute('thumb', '');
            thumb.setAttribute('data-thumb', '');

            this.track = track;
            this.thumb = thumb;
            this.$track = $(track);
            this.$thumb = $(thumb);

            this.push(track);
        }

        setScrollPercent(O) {
            var scrollTarget = this.scrollTarget;
            var scrollContainer = this.scrollContainer;
            var scrollPercent = O.at;

            var overflowPX = this.vertical
                ? scrollTarget.scrollHeight - $(scrollContainer).innerHeight() 
                : scrollTarget.scrollWidth - $(scrollContainer).innerWidth();  // outerWidth?

            var translate = -(scrollPercent * overflowPX);

            var css = this.horizontal ? `translateX(${translate}px)` : `translateY(${translate}px)`;

            ((this.proxifyScrolling)  
                ? $(scrollTarget).children().not('.' + Scrollbar.namespace)
                : $(scrollTarget)
            ).each(function() {
                this.style.transform = css;
            });
        }

        tryCatch(a, b) {

        }

        raw(el) { if (el instanceof jQuery) {return el[0]} return el; }

        checkOverflow(inner, outer, callback) {
            var overflowX = inner.scrollWidth > $(outer).outerWidth();
            var overflowY = inner.scrollHeight > $(outer).outerHeight();
            callback.call(null, overflowX, overflowY); // set them to numeric values instead?
            return { overflowX: overflowX, overflowY: overflowY }
        }

        assignEventHandlers() {

            var self = this;

            // wait until the element is inserted into the DOM to assign event handlers, as we need to know whether the
            // scrollbar implictly controls its parent (parent children, to be exact), or an explicitly queried element
            whenInsertedTo(document, this.track, this, function(e) { // document.body // scope: this

                function clamp(n, min, max) { return Math.max(min, Math.min(n, max)) }

                function bounds(element) {
                    const $el = $(element);
                    const { left, top } = $el.offset(); 
                    const width = $el.outerWidth();
                    const height = $el.outerHeight();
                    return { left, top, width, height, right: left+width, bottom: top+height };
                }

                function keepActiveClass(e) {
                    // { e.preventDefault(); e.stopPropagation(); }
                    if ($(this).data('dragging') !== 'true') {
                        $(this).toggleClass('active', e.type === 'mouseenter');
                    }
                }

                let begin, middle, end; 
                let track = self.track; // scrollbar
                let scrollbar = self.track;
                let thumb = self.thumb;

                $(thumb).on('mouseenter mouseleave', keepActiveClass);

                let axis = self.axis;
                let vertical = self.vertical;

                let scrollContainer = scrollbar.parentNode; // might want the scroll container to be different?
                let scrollTarget = (function(controls) {

                    // controls => null or undefined: control parent children
                    // controls => explicitly set: query selector or specific element: control that specific element
                    if (!controls || controls === 'parent') {
                        if (Scrollbar.debug) { console.warn('Setting implicit controls: parent children'); }
                        self.proxifyScrolling = true;
                        return track.parentNode;
                    } else {
                        let $controls = $(controls)[0];
                        if (!$controls) {
                            throw new TypeError('No controls found!')
                        }
                        return $controls;
                    }
                    
                })(self.controls);

                $(scrollContainer).css('position', 'relative');

                this.scrollContainer = scrollContainer;  
                this.scrollTarget = scrollTarget;

                self.checkOverflow(scrollTarget, scrollContainer, (overflowX, overflowY) => {
                    $(track)[(self.horizontal ? overflowX : overflowY) ? 'show' : 'hide']();
                });

                try {
                    let observer = new ResizeObserver(() => {
                        self.checkOverflow(scrollTarget, scrollContainer, (overflowX, overflowY) => {
                            $(track)[(self.horizontal ? overflowX : overflowY) ? 'show' : 'hide']();
                        });
                    });
                    observer.observe(scrollTarget);
                    observer.observe(scrollContainer);
                } catch(e) {
                    console.error('Resize observer not supported: '+ e);
                }

                var onDrag = function(element, e, dir) {
                    const vertical = self.vertical;
                    const thumb = bounds(element);              // the position of the thumb
                    const track = bounds(element.parentNode);   // scrollbar (track) bounds.

                    let maxPos = vertical ? (track.bottom - thumb.height) : (track.right - thumb.width);
                    let spread = vertical ? Math.abs(track.top - maxPos) : Math.abs(track.left - maxPos);
                    let offset = vertical ? (thumb.top - track.top) : (thumb.left - track.left);
                    let scrollPercent = clamp(offset / spread, 0, 1); 
                    
                    self.setScrollPercent({ at: scrollPercent });

                    $(element.parentNode).data('scroll-percent', scrollPercent); // emit event here
                }
                
                makeDraggable({ 
                    target: thumb, 
                    axis: axis,
                    within: function() { return this.parentNode }, // `this` is context of the target within makeDraggable
                    hooks: {
                        begin: function(el, e){
                            $(el).addClass('active').data('dragging', 'true').css('cursor', 'grab')
                            begin?.(el, e);
                        },

                        dragging: function(el, e){
                            el.style.cursor = 'grabbing';
                            onDrag?.(el, e);
                            middle?.(el, e);
                        }, 

                        end: function(el, e) {
                            $(el).removeClass('active').data('dragging', 'false').css('cursor', '');
                            end?.(el, e);
                        }
                    }
                });

            });
        }
    }

function makeDraggable(O) { // ES5

    require(Object(O) === O, 'O must be object like'); 
    require(O.target, 'no drag target specified.');

    var ON = (O.on || 'mousedown');
    var OFF = (O.off || 'mouseup');
    var hooks = O.hooks || {};
    var begin = (hooks.begin || 0), middle = (hooks.middle || hooks.dragging || 0), end = (hooks.end || 0);
    var axis = (O.axis || 'both').toLowerCase();
    var X = (axis !== 'y');
    var Y = (axis !== 'x');
    var $elementToDrag = $(O.target);
    var $delegate = O.delegateWithin && $(O.delegateWithin);
    var within = O.within;

    function bounds(element) {
        const $el = $(element);
        const { left, top } = $el.offset(); 
        const width = $el.outerWidth();
        const height = $el.outerHeight();
        return { left, top, width, height, right: left+width, bottom: top+height };
    }

    function enableDrag(e) {
        { e.preventDefault(); e.stopPropagation(); }
        if (e.button || axis === 'none') {return false}

        var startX = e.pageX, startY = e.pageY;
        var offset = $elementToDrag.offset();
        var origX = offset.left;
        var origY = offset.top;

        var _self = this;
        var _container = (function() {
            if (!within) { return {} }
            if (within === 'parent') { return $(_self.parentNode); }
            if (typeof within === 'function') { return $(within.call(_self)); }
            return $(_self).parents(within).first();
        })()[0];

        var onMouseMove = function(move) {
            const pos = {};
            if (X) { pos.left = (move.pageX - startX) + origX; }
            if (Y) { pos.top = (move.pageY - startY) + origY; }

            $elementToDrag.offset(pos);

            if (within && _container) {
                const box = bounds($elementToDrag[0]);
                const container = bounds(_container);

                let maxLeft = (container.right - box.width); // any further and the box oversteps its boundaries
                let maxTop = (container.bottom - box.height); // any further and the box oversteps its boundaries

                // constrain axes
                if (X) {
                    if (box.left < container.left) { $elementToDrag.offset({ left: container.left }); }
                    if (box.right > container.right) { $elementToDrag.offset({ left: maxLeft }); }
                }
                if (Y) {
                    if (box.top < container.top) { $elementToDrag.offset({ top: container.top }); }
                    if (box.bottom > container.bottom) { $elementToDrag.offset({ top: maxTop }); }
                }
            };

            $elementToDrag.each(function() {
                middle?.(this, move);
            })
        };

        function onMouseUp(up) {
            $(document).off('mousemove', onMouseMove).off(OFF, onMouseUp); 
            end?.($elementToDrag[0], up);
        };

        begin?.($elementToDrag[0], e); // add multi-drag handler
        $(document).on('mousemove', onMouseMove).on(OFF, onMouseUp);
    };

    !($delegate && $delegate.length) ? $elementToDrag.on(ON, enableDrag) : $delegate.on(ON, O.target, function(e){
        $elementToDrag = O.dragAncestor ? $(this).parents(O.dragAncestor).first() : $(this);
        enableDrag.call(this, e);
    });
}
