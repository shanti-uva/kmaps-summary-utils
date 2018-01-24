/*
 *  Project: UVa KMaps
 *  Description: Plugin to handle the fancyTree implementation with Solr
 *  Author: djrc2r
 */

// the semi-colon before function invocation is a safety net against concatenated
// scripts and/or other plugins which may not be closed properly.
;(function ( $, window, document, undefined ) {
  "use strict";

  var SOLR_ROW_LIMIT = 2000;
  var DEBUG = false;

  // undefined is used here as the undefined global variable in ECMAScript 3 is
  // mutable (ie. it can be changed by someone else). undefined isn't really being
  // passed in so we can ensure the value of it is truly undefined. In ES5, undefined
  // can no longer be modified.

  // window is passed through as local variable rather than global
  // as this (slightly) quickens the resolution process and can be more efficiently
  // minified (especially when both are regularly referenced in your plugin).

  // Create the defaults once
  var pluginName = 'kmapsPopup',
    defaults = {
      termIndex: "http://localhost/solr/kmterms_dev",
      assetIndex: "http://localhost/solr/kmassets_dev",
      tree: "places",
      featuresPath: "/features/%%ID%%",
      domain: "places",
      featureId: 1,
      perspective: "pol.admin.hier",
      seedTree: {
        descendants: false,
        directAncestors: true
      },
      displayPopup: false,
      mandalaURL: "https://mandala.shanti.virginia.edu/%%APP%%/%%ID%%/%%REL%%/nojs"
    };

  // The actual plugin constructor
  function Plugin( element, options ) {
    this.element = element;

    // jQuery has an extend method which merges the contents of two or
    // more objects, storing the result in the first object. The first object
    // is generally empty as we don't want to alter the default options for
    // future instances of the plugin
    this.options = $.extend( {}, defaults, options) ;

    this._defaults = defaults;
    this._name = pluginName;

    this.init();
  }

  Plugin.prototype = {
    init: function () {
      const plugin = this;
      // Place initialization logic here
      // You already have access to the DOM element and the options via the instance,
      // e.g., this.element and this.options
      var stringPath = "";
      var title = "";
      if(!plugin.options.featureId){
        plugin.options.featureId = jQuery(plugin.element).data('id').replace(plugin.options.domain+"-","");
      }
      decorateElementWithPopover(plugin.element, plugin.options.domain+'-'+plugin.options.featureId, title, stringPath, plugin.options.caption);

      function getNodeInfo() {
        const dfd = $.Deferred();
        var nodeInfo = [];
        nodeInfo['always']='present';
        var url = plugin.options.termIndex + '/select?q=id:' + plugin.options.domain+'-'+plugin.options.featureId + '&fl=header,ancestor*&wt=json&json.wrf=?';
        $.ajax({
          type: "GET",
          url: url,
          dataType: "jsonp",
          timeout: 90000,
          error: function (e) {
            console.error(e);
            dfd.resolve([]);
            // countsElem.html("<i class='glyphicon glyphicon-warning-sign' title='" + e.statusText);
          },
          beforeSend: function () {
          },

          success: function (data) {
            var doc = data.response.docs[0];
            var ancestorsKey  = "ancestor_ids_" + plugin.options.perspective;
            var ancestorsNameKey  = "ancestors_" + plugin.options.perspective;
            if( doc[ancestorsKey] === undefined ) {
              ancestorsKey  = "ancestor_ids_closest_" + plugin.options.perspective;
              ancestorsNameKey  = "ancestors_closest_" + plugin.options.perspective;
            }
            nodeInfo['ancestors'] = doc[ancestorsKey] === undefined ? "" : doc[ancestorsKey].reduce(function(acc,val,index){
              var currAncestor = "<a href='"+plugin.options.featuresPath.replace("%%ID%%",val)+"'>"+doc[ancestorsNameKey][index]+"</a>"
              acc += "/"+currAncestor;
              return acc;
            }, "");
            nodeInfo['title'] = "<strong>" + doc["header"] + "</strong>";
            dfd.resolve(nodeInfo);
          }
        });
        return dfd.promise();
      }

      function decorateElementWithPopover(elem, key, title, path, caption) {
        //if (DEBUG) console.log("decorateElementWithPopover: "  + elem);

        if (jQuery(elem).popover) {
          jQuery(elem).attr('rel', 'popover');

          //if (DEBUG) console.log("caption = " + caption);
          jQuery(elem).popover({
            html: true,
            content: function () {
              caption = ((caption) ? caption : "");
              var popover = "<div id='popover-content-" + key +"'>" + path + "</div>";
              return popover;
            },
            title: function () {
              return title + "<span class='kmapid-display'>" + key + "</span>";
            },
            trigger: 'manual',
            placement: 'bottom',
            delay: {hide: 5},
            container: 'body'
          }
          ).on("mouseenter", function (e) {
            var _this = this;
            $(this).popover("show");
            var offsetW = $(".popover").width()/2;
            $(".popover").css({left: e.pageX-offsetW });
            $(".popover").on("mouseleave", function () {
              $(_this).popover('hide');
            });
          }).on("mouseleave", function () {
            var _this = this;
            setTimeout(function () {
              if (!$(".popover:hover").length) {
                $(_this).popover("hide");
              }
            }, 300);
          }).on('mousemove',function(e){
            var offsetH = $(".popover").height();
            var offsetW = $(".popover").width()/2;
            var _this = this;
            //$(this).popover("show");
            $(".popover").css({left: e.pageX-offsetW });
          });

          jQuery(elem).on('shown.bs.popover', function (x) {
            $("body > .popover").removeClass("related-resources-popover"); // target css styles on search tree popups
            $("body > .popover").addClass("search-popover"); // target css styles on search tree popups

            var popOverContent = $("#popover-content-"+key);
            var nodeInfoAsync = getNodeInfo();
            nodeInfoAsync.then(function(nodeInfo){
              var ancestorsPath = nodeInfo['ancestors'] === undefined ? "" : nodeInfo['ancestors'];
              var title = nodeInfo['title'] === undefined ? "" : nodeInfo['title'];
              popOverContent.parent().prepend(ancestorsPath);
              popOverContent.parent().parent().find('.popover-title').prepend(title);
            });
            var popOverFooter = $("<div class='popover-footer'></div>");
            popOverFooter.append("<div class='popover-footer-button'><a href='"+plugin.options.featuresPath.replace("%%ID%%",key.replace(plugin.options.domain+'-',""))+"' class='icon shanticon-link-external' target='_blank'>Full Entry</a></div>");
            popOverFooter.append("<div style='display: none' class='popover-footer-button'><a href='"+plugin.options.mandalaURL.replace("%%ID%%",key.replace(plugin.options.domain+'-',"")).replace("%%APP%%",plugin.options.domain).replace("%%REL%%","sources")+"' class='icon shanticon-sources' target='_blank'>Related sources (<span class='badge-count' >?</span>)</a></div>");
            popOverFooter.append("<div style='display: none' class='popover-footer-button'><a href='"+plugin.options.mandalaURL.replace("%%ID%%",key.replace(plugin.options.domain+'-',"")).replace("%%APP%%",plugin.options.domain).replace("%%REL%%","audio-video")+"' class='icon shanticon-audio-video' target='_blank'>Related audio-video (<span class='badge-count' >?</span>)</a></div>");
            popOverFooter.append("<div style='display: none' class='popover-footer-button'><a href='"+plugin.options.featuresPath.replace("%%ID%%",key.replace(plugin.options.domain+'-',""))+"#show_relationship=pictures' class='icon shanticon-photos' target='_blank'>Related photos (<span class='badge-count' >?</span>)</a></div>");
            popOverFooter.append("<div style='display: none' class='popover-footer-button'><a href='"+plugin.options.featuresPath.replace("%%ID%%",key.replace(plugin.options.domain+'-',""))+"#show_relationship=documents' class='icon shanticon-texts' target='_blank'>Related texts (<span class='badge-count' >?</span>)</a></div>");
            popOverFooter.append("<div style='display: none' class='popover-footer-button'><a href='"+plugin.options.mandalaURL.replace("%%ID%%",key.replace(plugin.options.domain+'-',"")).replace("%%APP%%",plugin.options.domain).replace("%%REL%%","visuals")+"' class='icon shanticon-visuals' target='_blank'>Related visuals (<span class='badge-count' >?</span>)</a></div>");
            popOverFooter.append("<div style='display: none' class='popover-footer-button'><a href='"+plugin.options.featuresPath.replace("%%ID%%",key.replace(plugin.options.domain+'-',""))+"#show_relationship=places' class='icon shanticon-places' target='_blank'>Related places (<span class='badge-count' >?</span>)</a></div>");
            popOverFooter.append("<div style='display: none' class='popover-footer-button'><a href='"+plugin.options.featuresPath.replace("%%ID%%",key.replace(plugin.options.domain+'-',""))+"#show_relationship=subjects' class='icon shanticon-subjects' target='_blank'>Related subjets (<span class='badge-count' >?</span>)</a></div>");
            popOverContent.append(popOverFooter);
            //var countsElem = $("#popover-content-" + key + " .counts-display");
            //countsElem.html("<span class='assoc-resources-loading'>loading...</span>\n");
            var countsElem = popOverFooter;
            countsElem.append("<span class='assoc-resources-loading'>loading...</span>\n");

            // highlight matching text (if/where they occur).
            var txt = $('#searchform').val();
            // $('.popover-caption').highlight(txt, {element: 'mark'});


            var fq = plugin.options.solr_filter_query;

            var project_filter = (fq) ? ("&" + fq) : "";
            var kmidxBase = plugin.options.assetIndex;
            if (!kmidxBase) {
              console.error("plugin.option.assetIndex not set!");
            }

            var termidxBase = plugin.options.termIndex;
            if (!termidxBase) {
              console.error("plugin.options.termIndex not set!");
            }

            // Update counts from asset index
            var assetCountsUrl =
              kmidxBase + '/select?q=kmapid:' + key + project_filter + '&start=0&facets=on&group=true&group.field=asset_type&group.facet=true&group.ngroups=true&group.limit=0&wt=json&json.wrf=?';
            $.ajax({
              type: "GET",
              url: assetCountsUrl,
              dataType: "jsonp",
              timeout: 90000,
              error: function (e) {
                console.error(e);
                // countsElem.html("<i class='glyphicon glyphicon-warning-sign' title='" + e.statusText);
              },
              beforeSend: function () {
              },

              success: function (data) {
                if (DEBUG) console.log("shown.bs.popover handler: data = " + JSON.stringify(data, undefined, 1));
                var updates = {};

                // extract the group counts -- index by groupValue
                $.each(data.grouped.asset_type.groups, function (x, y) {
                  var asset_type = y.groupValue;
                  var asset_count = y.doclist.numFound;
                  if (DEBUG) console.log(asset_type + " = " + asset_count);
                  updates[asset_type] = asset_count;
                });

                if (DEBUG) console.log("shown.bs.popover handler: " + key + "(" + title + ") : " + JSON.stringify(updates));
                update_counts(countsElem, updates)
              }
            });

            // Update related place and subjects counts from term index


            // {!child of=block_type:parent}id:places-22675&wt=json&indent=true&group=true&group.field=block_child_type&group.limit=0
            var relatedCountsUrl =
              termidxBase + '/select?q={!child of=block_type:parent}id:' + key + project_filter + '&wt=json&indent=true&group=true&group.field=block_child_type&group.limit=0&wt=json&json.wrf=?';
            if (DEBUG) console.error("relatedCountsUrl = " + relatedCountsUrl);
            $.ajax({
              type: "GET",
              url: relatedCountsUrl,
              dataType: "jsonp",
              timeout: 90000,
              error: function (e) {
                console.error(e);
                // countsElem.html("<i class='glyphicon glyphicon-warning-sign' title='" + e.statusText);
              },
              beforeSend: function () {
              },

              success: function (data) {
                if (DEBUG) console.log("shown.bs.popover handler: data = " + JSON.stringify(data, undefined, 1));
                var updates = {};

                // extract the group counts -- index by groupValue
                $.each(data.grouped.block_child_type.groups, function (x, y) {
                  var block_child_type = y.groupValue;
                  var rel_count = y.doclist.numFound;
                  if (DEBUG) console.log(block_child_type + " = " + rel_count);
                  updates[block_child_type] = rel_count;
                });

                if (DEBUG) console.log("shown.bs.popover handler: " + key + "(" + title + ") : " + JSON.stringify(updates));
                update_counts(countsElem, updates)
              }
            });

            // Another (parallel) query

            var subjectsRelatedPlacesCountQuery = termidxBase + "/select?indent=on&q={!parent%20which=block_type:parent}related_subject_uid_s:" + key + "&wt=json&json.wrf=?&group=true&group.field=tree&group.limit=0";

            $.ajax({
              type: "GET",
              url: subjectsRelatedPlacesCountQuery,
              dataType: "jsonp",
              timeout: 90000,
              error: function (e) {
                console.error(e);
                // countsElem.html("<i class='glyphicon glyphicon-warning-sign' title='" + e.statusText);
              },
              beforeSend: function () {
              },

              success: function (data) {
                if (DEBUG) console.log("shown.bs.popover handler: data = " + JSON.stringify(data, undefined, 1));
                var updates = {};
                // extract the group counts -- index by groupValue
                $.each(data.grouped.tree.groups, function (x, y) {
                  var tree = y.groupValue;
                  var rel_count = y.doclist.numFound;
                  if (DEBUG) console.error(tree + " = " + rel_count);
                  updates["related_" + tree] = rel_count;
                });

                update_counts(countsElem, updates)
              }
            });


          });
        }

        function update_info(elem,info){
        }
        function update_counts(elem, counts) {

          // console.log("elem = ");
          // console.dir(elem);
          // console.error(JSON.stringify(counts,undefined,2));

          var av = elem.find('.shanticon-audio-video > span.badge-count');
          if (typeof(counts["audio-video"]) != "undefined") {
            (counts["audio-video"]) ? av.html(counts["audio-video"]).parent().show() : av.parent().hide();
          }
          if (Number(av.text()) > 0) {
            av.parent().parent().show();
          } else {
            av.parent().parent().hide();
          }

          var photos = elem.find('.shanticon-photos > span.badge-count');
          if (typeof(counts.picture) != "undefined") {
            photos.html(counts.picture);
          }
          (Number(photos.text()) > 0) ? photos.parent().parent().show() : photos.parent().parent().hide();

          var places = elem.find('.shanticon-places > span.badge-count');
          if (typeof(counts.related_places) != "undefined") {
            places.html(counts.related_places);
          }
          if (Number(places.text()) > 0) {
            places.parent().parent().show();
          } else {
            places.parent().parent().hide();
          }

          var texts = elem.find('.shanticon-texts > span.badge-count');
          if (typeof(counts.texts) != "undefined") {
            texts.html(counts["texts"]);
          }
          if (Number(texts.text()) > 0) {
            texts.parent().parent().show();
          } else {
            texts.parent().parent().hide();
          }

          var subjects = elem.find('.shanticon-subjects > span.badge-count');

          if (!counts.feature_types) {
            counts.feature_types = 0
          }
          ;
          if (!counts.related_subjects) {
            counts.related_subjects = 0
          }
          ;

          var s_counts = Number(counts.related_subjects) + Number(counts.feature_types);
          if (DEBUG) {
            console.error("related_subjects  = " + Number(counts.related_subjects));
            console.error("feature_types  = " + Number(counts.feature_types));
            console.error("Calculated subject count: " + s_counts);
          }
          if (s_counts) {
            subjects.html(s_counts);
          }
          if (Number(subjects.text()) > 0) {
            subjects.parent().parent().show();
          } else {
            subjects.parent().parent().hide();
          }


          var visuals = elem.find('.shanticon-visuals > span.badge-count');
          if (typeof(counts.visuals) != "undefined") {
            visuals.html(counts.visuals);
          }
          if (Number(visuals.text()) > 0) {
            visuals.parent().parent().show();
          } else {
            visuals.parent().parent().hide();
          }

          var sources = elem.find('.shanticon-sources > span.badge-count');
          if (typeof(counts.sources) != "undefined") {
            sources.html(counts.sources);
          }
          if (Number(sources.text()) > 0) {
            sources.parent().parent().show();
          } else {
            sources.parent().parent().hide();
          }

          elem.find('.assoc-resources-loading').hide();

        }

        return elem;
      };
    },
  };

  // You don't need to change something below:
  // A really lightweight plugin wrapper around the constructor,
  // preventing against multiple instantiations and allowing any
  // public function (ie. a function whose name doesn't start
  // with an underscore) to be called via the jQuery plugin,
  // e.g. $(element).defaultPluginName('functionName', arg1, arg2)
  $.fn[pluginName] = function ( options ) {
    var args = arguments;

    // Is the first parameter an object (options), or was omitted,
    // instantiate a new instance of the plugin.
    if (options === undefined || typeof options === 'object') {
      return this.each(function () {

        // Only allow the plugin to be instantiated once,
        // so we check that the element has no plugin instantiation yet
        if (!$.data(this, 'plugin_' + pluginName)) {

          // if it has no instance, create a new one,
          // pass options to our plugin constructor,
          // and store the plugin instance
          // in the elements jQuery data object.
          $.data(this, 'plugin_' + pluginName, new Plugin( this, options ));
        }
      });

      // If the first parameter is a string and it doesn't start
      // with an underscore or "contains" the `init`-function,
      // treat this as a call to a public method.
    } else if (typeof options === 'string' && options[0] !== '_' && options !== 'init') {

      // Cache the method call
      // to make it possible
      // to return a value
      var returns;

      this.each(function () {
        var instance = $.data(this, 'plugin_' + pluginName);

        // Tests that there's already a plugin-instance
        // and checks that the requested public method exists
        if (instance instanceof Plugin && typeof instance[options] === 'function') {

          // Call the method of our plugin instance,
          // and pass it the supplied arguments.
          returns = instance[options].apply( instance, Array.prototype.slice.call( args, 1 ) );
        }

        // Allow instances to be destroyed via the 'destroy' method
        if (options === 'destroy') {
          $.data(this, 'plugin_' + pluginName, null);
        }
      });

      // If the earlier cached method
      // gives a value back return the value,
      // otherwise return this to preserve chainability.
      return returns !== undefined ? returns : this;
    }
  };
}(jQuery, window, document));
