(function ($) {

	$.fn.ableScrollbar = function (options, args) {
		var defaultOptions = {
			isAutoHide: true,
			hMask: 0,
			wMask: 0
		};

		var Scrollable = function (element, options, args) {
			this.lock =false;
			this.enabled =false;
			this.preScrollTop =0;;

			this.$element = $(element);
			this.options = options;

			this.addScrollableClass();
			this.addScrollBarComponents();
			this.addAdditionalComponents(args);
			this.$element.data("scrollTop", 0);

			this.resize();
			this.initMouseWheelScroll();
			this.initMouseMoveScroll();
			this.initMouseClickScroll();

			this.bindEvent();
			this.$element.data("scrollable", this);
		};

		Scrollable.prototype = {

			addScrollableClass: function() {
				if(!this.$element.hasClass("scrollable")) {
					this.scrollableAdded = true;
					this.$element.addClass("scrollable");
				}
			},

			removeScrollableClass: function() {
				if(this.scrollableAdded)
				this.$element.removeClass("scrollable");
			},

			addScrollBarComponents: function ()  {
				this.assignViewPort();
				if (this.$viewPort.length == 0)  {
					this.$element.wrapInner('<div class="viewport" />');
					this.assignViewPort();
					this.viewPortAdded = true;
				};
				this.assignOverview();
				if (this.$overview.length == 0)  {
					this.$viewPort.wrapInner('<div class="overview" />');
					this.assignOverview();
					this.overviewAdded = true;
				};
				this.assignScroll();
				if (this.$scroll.length == 0)  {
					var display =this.options.isAutoHide ? '' : 'show';
					this.$element.prepend('<div class="scroll-bar '+ display +'"><div class="thumb"></div></div>');
					this.assignScroll();
					this.scrollbarAdded = true;
				};
			},

			assignViewPort: function () {
				this.$viewPort = $(".viewport",this.$element);
			},

			assignOverview: function () {
				this.$overview = $(".overview",this.$viewPort);
			},

			assignScroll: function () {
				this.$scroll = $(".scroll-bar",this.$element);
				this.$thumb = $(".scroll-bar .thumb",this.$element);
			},

			addAdditionalComponents: function (args)  {
				if(this.$element.data('additionalComponent'))  return;
				if(!args || !args instanceof jQuery)  return;

				var _this =this;
				args.each(function()  {
					$(this).css({
						position:'absolute',
						zIndex:3
					});
					_this.$element.prepend($(this));
				});
				this.$element.data('additionalComponent',true);
			},

			resize: function (args) {
				var size = {
					hMask:this.options.hMask ? this.options.hMask : this.$element.height(),
					wMask:this.options.wMask ? this.options.wMask : this.$element.width()
				};
				if(typeof args =='number')		size.hMask =args;
				else if(typeof args =='object')	size =$.extend(size,args);

				this.$element.width(size.wMask).height(size.hMask);
				this.enabled = this.$overview.height() > this.$element.height();

				this.$viewPort.width(size.wMask + (this.enabled ? 17 : 0)).height(size.hMask);
				this.$viewPort.css('overflow-y','auto');

				var scrollWidth =this.$viewPort.width() - this.$overview.width();
				this.$viewPort.width(size.wMask + scrollWidth);


				// calculates
				this.ratio =this.$viewPort[0].scrollHeight / this.$viewPort.outerHeight();
				this.maxScrollTop =this.$viewPort[0].scrollHeight - this.$viewPort.outerHeight();
				this.maxThumbTop =this.maxScrollTop / this.ratio;

				this.$element.data('scrollHeight',this.$viewPort[0].scrollHeight);
				// set thumb height
				console.log(this.enabled);
				if(this.enabled)  {
					var thumbHeight =this.$viewPort.outerHeight() / this.ratio;
					if(thumbHeight < 17)  {
						thumbHeight =17;
						this.maxThumbTop =this.$viewPort.outerHeight() - thumbHeight;
						this.ratio =this.maxScrollTop / this.maxThumbTop;
					};
					this.$thumb.height(thumbHeight); // min 17
					this.setThumbPosition(this.$viewPort.scrollTop() / this.ratio,true);
				}
				else  {
					this.hideScroll();
					this.$viewPort.css('overflow-y','hidden');
				};
			},

			initMouseWheelScroll: function() {
				var _this =this;
				this.$viewPort.scroll(function()  {
					var t =$(this).scrollTop() / _this.ratio;
					_this.setThumbPosition(t);
					_this.$element.data('scrollTop',$(this).scrollTop());
				});
			},

			removeMouseWheelScroll: function() {
				this.$viewPort.unbind('scroll');
			},

			initMouseClickScroll:function () {
				var _this = this;
				this.scrollBarClick = function (event) {
					_this.mouseClickScroll(event);
				};
				this.$scroll.click(this.scrollBarClick);
			},

			removeMouseClickScroll: function() {
				this.$scroll.unbind("click", this.scrollBarClick);
			},

			initMouseMoveScroll: function() {
				var _this =this;

				this.$thumb.mousedown(function (event) {
					_this.startMouseMoveScrolling(event);
				});

				this.documentMouseup = function (event) {
					_this.stopMouseMoveScrolling(event);
				};
				$(document).mouseup(this.documentMouseup);

				this.documentMousemove = function (event) {
					_this.mouseMoveScroll(event);
				};
				$(document).mousemove(this.documentMousemove);

				this.$thumb.click(function (event) {
					event.stopPropagation();
				});
			},

			removeMouseMoveScroll: function() {
				this.$thumb.unbind();
				$(document).unbind("mouseup", this.documentMouseup);
				$(document).unbind("mousemove", this.documentMousemove);
			},


			mouseClickScroll:function (event) {
				if (this.lock)  return true;
				if (!this.enabled && this.mouseMoveScrolling)  return true;
				var delta = this.$viewPort.outerHeight() - 20;
				if (event.pageY < this.$thumb.offset().top)  delta = -delta;
				
				// this.scrollBy(delta);
				var preThumbTop =this.$thumb.position().top,
					thumbTop =preThumbTop + (delta / this.ratio);

				this.setThumbPosition(thumbTop);
				this.setScrollPosition(delta);
			},

			startMouseMoveScrolling:function (event) {
				if (this.lock)  return true;
				this.mouseMoveScrolling = true;
				$("html").addClass("not-selectable");
				this.$thumb.addClass('thumbDown');
				// this.setUnselectable($("html"), "on");
				this.prePageY =event.pageY;
				this.cover =$('<div class="scrollCover"></div>');
				this.cover.width($(window).width()).height($(document.body).height()).prependTo(document.body);
			},

			stopMouseMoveScrolling:function (event) {
				this.mouseMoveScrolling = false;
				$("html").removeClass("not-selectable");
				this.$thumb.removeClass('thumbDown');
				// this.setUnselectable($("html"), null);
				if(this.cover)  {
					this.cover.remove();
					this.cover =null;
				}
			},

			setUnselectable:function (element, value) {
				if (element.attr("unselectable") != value) {
					element.attr("unselectable", value);
					element.find(':not(input)').attr('unselectable', value);
				}
			},

			mouseMoveScroll:function (event) {
				if (this.lock)  return true;
				if(this.enabled && this.options.isAutoHide)  {
					this.parentObj = $(event.target).parents('.scrollable');
					
					if($(event.target).hasClass('scrollable') || this.parentObj.length)  {
						if(this.$element.get(0) === this.parentObj.get(0))  {
							if(this.isShow > 0) clearTimeout(this.isShow);
							this.showScroll();
						}
						else if(!this.mouseMoveScrolling && this.isShowScroll)  this.hideScroll();
					}
					else if(!this.mouseMoveScrolling && this.isShowScroll)  this.hideScroll();
				};
				if(this.mouseMoveScrolling) {
					this.moveScroll(event, 1);
				};
			},

			showScroll:function()  {
				if(!this.isShowScroll)  {
					this.$scroll.addClass('show');
					this.isShowScroll =true;
				}
			},

			hideScroll:function()  {
				this.$scroll.removeClass('show');
				this.isShowScroll =false;
			},

			moveScroll:function (event, turn) {
				if (this.lock)  return true;
				var delta = (event.pageY - this.prePageY) * turn,
					preThumbTop =this.$thumb.position().top;
				this.setThumbPosition(preThumbTop + delta);
				this.setScrollPosition(delta * this.ratio);
				this.prePageY = event.pageY;
			},

			setThumbPosition:function (t,noTrigger) {
				t = t < 0 ? 0 : t;
				t = t > this.maxThumbTop ? this.maxThumbTop : t;
				this.$thumb.css('top',t +'px');
				if(!noTrigger)
				this.$element.trigger("ablescroll",[this.$viewPort.scrollTop(),t == this.maxThumbTop]);
			},

			setScrollPosition:function (delta) {
				var t = this.$viewPort.scrollTop() + delta;
				this.$viewPort.scrollTop(t);
				this.$element.data('scrollTop',t);
			},

			scrollTo:function (t) {
				if(!this.enabled)  return true;
				t = t || 0;
				if(t > this.maxScrollTop) t =this.maxScrollTop;

				this.$viewPort.scrollTop(t);
				this.$element.data('scrollTop',t);
				
				var thumbTop =this.$viewPort.scrollTop() / this.ratio;
				this.setThumbPosition(thumbTop,true);
			},


			remove: function() {
				this.removeMouseWheelScroll();
				this.removeMouseMoveScroll();
				this.removeMouseClickScroll();
				// this.removeTouchScrolling();
				// this.removeWindowResize();
			},

			bindEvent: function()  {
				if (this.options.onScroll)
					this.$element.bind("ablescroll", this.options.onScroll);
			}			
		};

		return this.each(function () {
			if (options == undefined)  options = defaultOptions;

			if (typeof(options) == "string") {
				var scrollable = $(this).data("scrollable");
				if(scrollable)  scrollable[options](args);
			}
			else if (typeof(options) == "object") {
				options =$.extend(defaultOptions, options);
				new Scrollable(this, options, args);
			}
			else throw "Invalid type of options";
		});
	};
})(jQuery);
