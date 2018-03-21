# Kmaps Summary Utils

This project contains JavaScript libraries that help build the summary section for the related features tab. The plugin and libraries depend on jQuery so be sure to have it installed. The Summary is usually paired with the Relations Tree, if you are looking for the [Kmaps Relations Tree](https://github.com/shanti-uva/kmaps-relations-tree) click [here](https://github.com/shanti-uva/kmaps-relations-tree). 

If you want to see a demo of the Summary tab visit [PLACES](http://staging-places.kmaps.virginia.edu/features/637#show_relationship=places) and hit the `Summary` tab.

## Getting Started

Download all the code on the `js` folder in our git repository:
* [https://github.com/shanti-uva/kmaps-summary-utils](https://github.com/shanti-uva/kmaps-summar-utils)

You can clone it or just download the libraries.

### Prerequisites

The requires:

* jQuery library
* Kmaps app (the plugins and libraries were designed for the KMAPS apps so you need an instance for it to run)
* Solr index where the data is stored (and consulted)

You'll notice that there is no CSS provided, it should be part of your KMAPS app.

### How to use it:

First lets see a small description of each of the files:

* `solr-utils.js` Contains the code that directly relates to the Solr server, it works as a sort of API between Solr and the plugins (Except the KmapsPopup, this plugin still needs to be incorporated to the solr-utils).
* `jquery.kmapsCollapsibleList.js` a small plugin to handle expand and collapse of lists.
* ` jquery.kmaps-popup.js` this jQuery Plugin handles the display of pop-ups with specific information of a feature.

To use build the summary tab we will use the following ERB Template (it can easily be modified to be used with handlebars or any other templating system).The ERB file structure shows that we are going to display two tabs (it assumes  bootstrap), one for the `Relation Tree` and one for `Summary` to use the relation tree please refer to [Kmaps Relations Tree](https://github.com/shanti-uva/kmaps-relations-tree).

Note:
the `feature_label` represents a function that will Display the current feature's Display Name (or label).
```HTML
<div id='myTabs'>
  <!-- Nav tabs -->
  <ul class="nav nav-tabs" role="tablist">
    <li role="presentation" class="active"><a href="#relation_tree" aria-controls="profile" role="tab" data-toggle="tab">Relationships</a></li>
    <li role="presentation"><a id="summary-tab-link" href="#relation_details" aria-controls="home" role="tab" data-toggle="tab">Summary</a></li>
  </ul>
  <!-- Tab panes -->
  <div class="tab-content">
    <div role="tabpanel" class="tab-pane active" id="relation_tree">
      <section class="panel panel-content">
        <div class="panel-body">
          <p>
           <strong><%= feature_label %></strong> has <strong class="relatedCountContainer"></strong> subordinate places. You can browse those subordinate places as well as its superordinate places with the tree below. See the summary tab if you instead prefer to view only  its immediately subordinate places grouped together in useful ways, as well as places non-hierarchically related to it.
          </p>
            <div id='relation_tree_container'></div>
        </div> <!-- END panel-body -->
      </section> <!-- END panel -->
  </div>
    <div role="tabpanel" class="tab-pane" id="relation_details">
      <section class="panel panel-content">
        <div class="panel-body">
          <p>
           <strong><%= feature_label %></strong> has <strong class="relatedCountContainer"><%#= relation_counts %></strong> other places directly related to it, which are presented here. See the relationships tab if you instead prefer to browse  all subordinate and superordinate places for<%= feature_label %>.
          </p>
          <div class='tab-content-loading' style="display:none">Loading...</div>
          <div class="collapsible_btns_container" style="display:none" >
            <h5> <span class="collapsible_all_btn collapsible_expand_all">Expand all</span> / <span class="collapsible_all_btn collapsible_collapse_all">Collapse all</span></h5>
          </div>
        <div class="places-in-places kmaps-list-columns related-features-categories has-ajax-pagination has-hash-feature-links"></div>
        <div class="collapsible_btns_container" style="display:none">
          <h5> <span class="collapsible_all_btn collapsible_expand_all">Expand all</span> / <span class="collapsible_all_btn collapsible_collapse_all">Collapse all</span> </h5>
        </div>
        <br />
        </div> <!-- END panel-body -->
      </section> <!-- END panel -->
		</div>
	</div> <!-- Tab Panes end -->
</div> <!-- myTabs end -->
```

So that will give you the HTML structure your structure might change but it ilustrates a good use case. Now lets work with the JavaScript, lets first set the Solr utils library, you'll need your Solr Index information for this step.

Initializing Solr utils Library, example:
```javascript
  var relatedSolrUtils = kmapsSolrUtils.init({
    termIndex: "https://YOURSOLRSERVER/INDEX/URL",
    assetIndex: "https://YOURSOLRSERVER/INDEX/URL",
    featureId:  "FEATUREID", //Your featureId will have the format APP-ID(eg. subjects-20, places-637)
    domain: "APP_NAME", //Use the apps name [places|subjects|terms]
    perspective: "CURRENT_PERSPECTIVE.CODE",
  });
```

After initializing the Solr utils library your plugins will be able to make us of it, so this has to be done before any of the other plugins can be executed or they won't be able to connect to solr.

Most of the functions provided by the library return promises so take that into account when using the library, for example check the following code to fill up the count, in our markup we had specified some place holders for our direct descendants counts, here is the JavaScript code that will fill that count:

```javascript
  //Related Counts on Solr
  relatedSolrUtils.getDirectDescendantCount().then(function(count){
      $(".relatedCountContainer").each(function(){
          $(this).html(count);
      });
  });
```

Ok, now because there are some details to take into account on how bootstrap opens a new tab (`shown.bs.tab`) we will show an example of how the `show.bs.tab` can be handled, we have to apply all the plugins renders and initializations after the tab is show or the `show.bs.tab` will override some of the behaviour, that is why we are adding this code when the tab is toggled. The code will apply the `KmapsCollapsibleList` plugin just by calling `$('.collapsibleList').kmapsCollapsibleList(); ` on all the elements with class `collapsibleList`.

The code also contains code for `columnizer` if you are going to use it you'll have to download it and add it in your dependencies.

The following code uses the Place Summary Items, we'll show the code for Subjects it is just the name of the functions that change but we will show the whole code again for Subjects.

```javascript
  var summaryLoaded = false;
  var collapsibleApplied = false;
  var popupsSet = false;
  var columnizedApplied = false;

  var feature_label = 'FEATURE NAME OR DISPLAY LABEL'; //Change this to the feature display label
  var feature_path = "HTTPS://YOUR_FEATURES_PATH>/%%ID%%"; //Change this to your feature path you can use Drupal's mode too, just using %%ID%% to match the pattern

  $('#summary-tab-link[data-toggle="tab"]').on('shown.bs.tab', function (e) {
  //Code for Summary
  if(!summaryLoaded){
    $("#relation_details .tab-content-loading").show();
    relatedSolrUtils.getPlacesSummaryElements().then(function(result){
      relatedSolrUtils.addPlacesSummaryItems(feature_label,feature_path,'parent',result);
      relatedSolrUtils.addPlacesSummaryItems(feature_label,feature_path,'child',result);
      //relatedSolrUtils.addPlacesSummaryItems(feature_label,feature_path,'other',result);

      // Functionality for columnizer
      // dontsplit = don't break these headers
      $('.places-in-places').find('.column > h6, .column > ul > li, .column ul').addClass("dontsplit");
      // dontend = don't end column with headers
      $('.places-in-places').find('.column > h6, .column > ul > li').addClass("dontend");
      $('.places-in-places').find('.feature-block').addClass("dontsplit");
      if(!columnizedApplied){
        $('.kmaps-list-columns:not(.subjects-in-places):not(.already_columnized)').addClass('already_columnized').columnize({
          width: 330,
          lastNeverTallest : true,
          buildOnce: true,
        });
        columnizedApplied = true;
      }
      if(!collapsibleApplied){
        $('.collapsibleList').kmapsCollapsibleList();
        collapsibleApplied = true;
      }
      if(!popupsSet){
        jQuery('#relation_details .popover-kmaps').kmapsPopup({
          termIndex: "https://YOURSOLRSERVER/INDEX/URL",
          assetIndex: "https://YOURSOLRSERVER/INDEX/URL",
          featureId:  "", //Leave Empty the JavaScript code will obtain it from the data-id of the DOM element
          domain: "APP_NAME", //Use the apps name [places|subjects|terms]
          perspective: "CURRENT_PERSPECTIVE.CODE",
          feature_path: "HTTPS://YOUR_FEATURES_PATH>/%%ID%%", //Change this to your feature path you can use Drupal's mode too, just using %%ID%% to match the pattern
          solrUtils: relatedSolrUtils // Add the SolrUtils object
        });
        popupsSet = true;
       }
      $("#relation_details .tab-content-loading").hide();
      $("#relation_details .collapsible_btns_container").show();
      summaryLoaded = true;
    });
  }
  }); // END - Summary Tab on show action
```

Same code but for Subjects.
```javascript
  var summaryLoaded = false;
  var collapsibleApplied = false;
  var popupsSet = false;
  var columnizedApplied = false;

  var feature_label = 'FEATURE NAME OR DISPLAY LABEL'; //Change this to the feature display label
  var feature_path = "HTTPS://YOUR_FEATURES_PATH>/%%ID%%"; //Change this to your feature path you can use Drupal's mode too, just using %%ID%% to match the pattern

  $('#summary-tab-link[data-toggle="tab"]').on('shown.bs.tab', function (e) {
  //Code for Summary
  if(!summaryLoaded){
    $("#relation_details .tab-content-loading").show();
    relatedSolrUtils.getSubjectsSummaryElements().then(function(result){
      relatedSolrUtils.addSubjectsSummaryItems(feature_label,feature_path,'parent',result);
      relatedSolrUtils.addSubjectsSummaryItems(feature_label,feature_path,'child',result);
      //relatedSolrUtils.addSubjectsSummaryItems(feature_label,feature_path,'other',result);

      // Functionality for columnizer
      // dontsplit = don't break these headers
      $('.places-in-places').find('.column > h6, .column > ul > li, .column ul').addClass("dontsplit");
      // dontend = don't end column with headers
      $('.places-in-places').find('.column > h6, .column > ul > li').addClass("dontend");
      $('.places-in-places').find('.feature-block').addClass("dontsplit");
      if(!columnizedApplied){
        $('.kmaps-list-columns:not(.subjects-in-places):not(.already_columnized)').addClass('already_columnized').columnize({
          width: 330,
          lastNeverTallest : true,
          buildOnce: true,
        });
        columnizedApplied = true;
      }
      if(!collapsibleApplied){
        $('.collapsibleList').kmapsCollapsibleList();
        collapsibleApplied = true;
      }
      if(!popupsSet){
        jQuery('#relation_details .popover-kmaps').kmapsPopup({
          termIndex: "https://YOURSOLRSERVER/INDEX/URL",
          assetIndex: "https://YOURSOLRSERVER/INDEX/URL",
          featureId:  "", //Leave Empty the JavaScript code will obtain it from the data-id of the DOM element
          domain: "APP_NAME", //Use the apps name [places|subjects|terms]
          perspective: "CURRENT_PERSPECTIVE.CODE",
          feature_path: "HTTPS://YOUR_FEATURES_PATH>/%%ID%%", //Change this to your feature path you can use Drupal's mode too, just using %%ID%% to match the pattern
          solrUtils: relatedSolrUtils // Add the SolrUtils object
        });
        popupsSet = true;
       }
      $("#relation_details .tab-content-loading").hide();
      $("#relation_details .collapsible_btns_container").show();
      summaryLoaded = true;
    });
  }
  }); // END - Summary Tab on show action
```



If we want to add some code for the `Collapse All/ Expand All` we can do it as follows:

```javascript
  $(".collapsible_expand_all").on("click",function(e){
   $(".collapsible_collapse_all").removeClass("collapsible_all_btn_selected");
    if (!$(".collapsible_expand_all").hasClass("collapsible_all_btn_selected")) {
     $(".collapsible_expand_all").addClass("collapsible_all_btn_selected");
    }
    $('.collapsibleList').kmapsCollapsibleList('expandAll');
  });
  $(".collapsible_collapse_all").on("click",function(e){
   $(".collapsible_expand_all").removeClass("collapsible_all_btn_selected");
    if (!$(".collapsible_collapse_all").hasClass("collapsible_all_btn_selected")) {
     $(".collapsible_collapse_all").addClass("collapsible_all_btn_selected");
    }
    $('.collapsibleList').kmapsCollapsibleList('collapseAll');
  });
```

And as a bonus if we had the KmapsRelationsTree we can activate it using the following code, for more information go to the git hub repo [Kmaps Relations Tree](https://github.com/shanti-uva/kmaps-relations-tree).

```javascript
  $("#relation_tree_container").kmapsRelationsTree({
    termIndex: "https://YOURSOLRSERVER/INDEX/URL",
    assetIndex: "https://YOURSOLRSERVER/INDEX/URL",
    featureId:  "FEATUREID", //Your featureId will have the format APP-ID(eg. subjects-20, places-637)
    tree: "APP_NAME", //Use the apps name [places|subjects|terms]
    domain: "APP_NAME", //Use the apps name [places|subjects|terms]
    perspective: "CURRENT_PERSPECTIVE.CODE",
    feature_path: "HTTPS://YOUR_FEATURES_PATH>/%%ID%%" //Change this to your feature path you can use Drupal's mode too, just using %%ID%% to match the pattern
    seedTree: {
      descendants: true,
      directAncestors: false,
    },
    displayPopup: true
  });
```

### Modifications for pop-up

all the pop-up decoration is done in the function: `decorateElementWithPopover` something important to note is that currently the links to the associated features is hard coded but it can easily be modified for this search for the `shown.bs.popover` action in the `decorateElementWithPopover` function, there you'll find the list of features that the popover show and just replace the link with what ever you need.

For example:
```
            popOverFooter.append("<div style='display: none' class='popover-footer-button'><a href='"+plugin.options.featuresPath.replace("%%ID%%",key.replace(plugin.options.domain+'-',""))+"#show_relationship=subjects' class='icon shanticon-subjects' target='_blank'>Related subjets (<span class='badge-count' >?</span>)</a></div>");
```

the link href is using the featuresPath URL but it can easily be changed to some other app link for example using the `mandlaURL`

```
            popOverFooter.append("<div style='display: none' class='popover-footer-button'><a href='"+plugin.options.mandalaURL.replace("%%ID%%",key.replace(plugin.options.domain+'-',"")).replace("%%APP%%",plugin.options.domain).replace("%%REL%%","subjects")+"' class='icon shanticon-subjects' target='_blank'>Related subjets (<span class='badge-count' >?</span>)</a></div>");
```


## Authors

* [Derik](https://github.com/rderik)


## Acknowledgements

* To everyone at [SHANTI](https://github.com/orgs/shanti-uva/people)
