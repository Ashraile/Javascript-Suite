scrollbar_ify('[scrollable]');

function bounds(el) {
    const $el = $(el);
    const { left, top } = $el.offset();
    const width = $el.outerWidth();
    const height = $el.outerHeight();
    return { left, top, width, height, right: left + width, bottom: top + height };
}

function scrollbar_ify(elements, begin, middle, end) {

    const SC = 'scrollbar';

    function clamp(n, min, max) { return Math.max(min, Math.min(n, max)) }
    function bounds(el) {
        const $el = $(el);
        const { left, top } = $el.offset();
        const width = $el.outerWidth();
        const height = $el.outerHeight();
        return { left, top, width, height, right: left + width, bottom: top + height };
    }
    function raw(el) { if (el instanceof jQuery) {return el[0]} return el; }

    function handleOverflow(dir, elementA, elementB, SCROLLBAR) {
        // elementA can be elementB
        // OR 
        // elementA can be a wrapper element inside elementB
        // either way we want to check whether elementA scrollHeight exceeds "elementB's" actual height.
        // elementA is the controlSelector, elementB is the container, or the controlSelector as well.
        { elementA = raw(elementA); elementB = raw(elementB); SCROLLBAR = raw(SCROLLBAR); }

        var overflows = dir === 'horizontal' ? 
            elementA.scrollWidth > $(elementB).outerWidth() :
            elementA.scrollHeight > $(elementB).outerHeight();

        $(SCROLLBAR)[(overflows ? 'show' : 'hide')]();
    }

    $(elements).each(function(e) {

        var container = this;
        var isHorizontal = (this.hasAttribute('horizontal') || this.hasAttribute('data-horizontal')) ? true : false;
        var controls = this.getAttribute('controls') || this.getAttribute('data-controls') || this.getAttribute('for') || '';
        var applyToScrollbarSiblings = !controls;
        var tag = ($(this).is('menu') || $(this).is('ul')) ? 'li' : 'div';
        var axis = isHorizontal ? 'x' : 'y';

        // Create scrollbar
        var $thumb = $('<span thumb data-thumb></span>');
        var $track = $('<'+tag+' class = "'+SC+'"></'+tag+'>').append($thumb).prependTo(container);
   
        $thumb.on('mouseenter mouseleave', function(e) {
            if ($(this).data('dragging') !== 'true') {
                $(this).toggleClass('active', e.type === 'mouseenter');
            }
        });

        if (isHorizontal) {
            $track.attr({ horizontal: '', 'data-horizontal': ''}); // set the attributes as existing
        } else {
            $track.add(this).attr({ vertical: '', 'data-vertical': '' });
        }

        // if no control selectors, assume the wrapper is the current element [we are to control siblings instead[from the context of the scrollbar]];
        // this scrollbar (track) also takes up the [width or height] content of its container in an oblong rectangle.
        // otherwise, a control selector was given, so monitor the element specified for resize changes
        controls = !controls ? $(this) : $(controls);

        var $target = controls;

        var observer = (function(dir) {
            handleOverflow(dir, controls, container, $track);
            return new ResizeObserver(function() { handleOverflow(dir, controls, container, $track); });
        })(isHorizontal ? 'horizontal' : 'vertical');

        observer.observe(raw($target));
        observer.observe(raw(container));

        if (!$target.length) { console.warn(this, 'No bound element found.'); }

        function onDrag(element, direction, e) {
            const thumb = bounds(element);              // the position of the thumb
            const track = bounds(element.parentNode);   // scrollbar (track) bounds.
            const vertical = direction === 'vertical';

            let maxPos = vertical ? (track.bottom - thumb.height) : (track.right - thumb.width);
            let spread = vertical ? Math.abs(track.top - maxPos) : Math.abs(track.left - maxPos);
            let offset = vertical ? (thumb.top - track.top) : (thumb.left - track.left);
            let scrollPercent = clamp(offset / spread, 0, 1);

            scrollToPercent($target, container, scrollPercent, applyToScrollbarSiblings, !vertical);
            $(element.parentNode).data('scroll-percent', scrollPercent); // emit event here
        }
        
        // target may be the same as container
        function scrollToPercent($target, $container, scrollPercent, applyToTargetChildren, horizontal) {
            $target = ($target instanceof jQuery) ? $target[0] : $target;
            const overflow = horizontal 
                ? ($target.scrollWidth - $($container).innerWidth()) 
                : ($target.scrollHeight - $($container).innerHeight()); // outerWidth?
            const translate = -(scrollPercent * overflow);
            const css = horizontal ? `translateX(${translate}px)` : `translateY(${translate}px)`;

            (applyToTargetChildren ? $($target).children(':not(.'+SC+')') : $($target) ).css('transform', css);
        }

        var direction = isHorizontal ? 'horizontal' : 'vertical';
    
        // function toggleVisibilityOnOverflow(eA, eB, element, direction)
        // makeDraggable is the modular 'drag' function. // dragAncestor: function() { return $(this)} ,// [0, 300, 200, 100]
        makeDraggable({ 
            target: $thumb[0], 
            axis: axis,
            within: function() { return this.parentNode },
            hooks: {
                begin: function(el, e){
                    el.style.cursor = "grab";
                    $(el).addClass('active');
                    $(el).data('dragging', 'true');
                    begin?.(el, e);
                },

                dragging: function(el, e){
                    el.style.cursor = 'grabbing';
                    onDrag?.(el, direction, e);
                }, 

                end: function(el, e) {
                    $(el).removeClass('active');
                    $(el).data('dragging', 'false');
                    el.style.cursor = '';
                    end?.(el, e);
                }
            }
        });

    }); // end each
}

function makeDraggable(O) { // ES5

    require(isObject(O)); 
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

        /*
        var onMouseMove = (function() {
            if (X && Y) {
                return function mousemoveXY(move) {
                    $elementToDrag.offset({ 
                        left: ((move.pageX - startX) + origX), 
                        top: ((move.pageY - startY) + origY)
                    }).each(function() { middle?.(this, move); });
                };
            } else if (X) {
                return function mousemoveX(move) {
                    $elementToDrag.offset({ left: (move.pageX - startX) + origX }).each(function() { middle?.(this,move); })
                };
            } else if (Y) {
                return function mousemoveY(move) {
                    $elementToDrag.offset({ top: (move.pageY - startY) + origY }).each(function() { middle?.(this,move); })
                };
            } else {
                return function notmoving(mouse) {};
            }
        })();
        */

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
