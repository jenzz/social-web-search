/*
 *  Title: QueryTwitter
 *  Author: Jens Driller
 *  Version: 0.1
 */

(function ($, window, document, undefined ) {

    // enable 'strict mode' for cleaner coding
    // http://ejohn.org/blog/ecmascript-5-strict-mode-json-and-more
    "use strict";

    // set default values for AJAX requests
    $.ajaxSetup({
        dataType: 'jsonp',
        timeout: 6000
    });



    /***************/
    /*  HOME PAGE  */
    /***************/
    var HomePage = {

        init: function () {

            this.cacheElements();
            this.bindEvents();

        },

        cacheElements: function () {

            this.homePage = $('div#home');
            this.searchPage = $('div#search');
            this.searchForm = $('#searchFormHome');
            this.searchInput = $('#searchInputHome');
            this.searchTypes = $('input[name=type]');

            this.chbTwitter = $('input#chbTwitter');
            this.chbFacebook = $('input#chbFacebook');
            this.chbGoogle = $('input#chbGoogle');

            this.chbPeople = $('input#chbPeople');
            this.chbPosts = $('input#chbPosts');

            this.imgAuthTwitter = $('img#imgAuthTwitter');
            this.imgAuthFacebook = $('img#imgAuthFacebook');
            this.imgAuthGoogle = $('img#imgAuthGoogle');
            this.imgAuthAll = $('img.authStatus');

        },

        bindEvents: function () {

            var self = this;

            // check if user is logged in to Twitter or Facebook
            $(self.homePage).live('pagebeforeshow', function() {

                TwitterAuthentication.checkAuthState();
                FacebookAuthentication.checkAuthState();

            });

            // user submits search form on home page
            $(self.searchForm).on('submit', function (e) {

                e.preventDefault();
                self.search();

            });

            // user changes search type
            $(self.searchTypes).on('change', function() {

                self.updateAuthenticationStatus();

            });

        },

        search: function () {            
            
            var self = this;
            
            // validate user input
            if ( self.validate() ) {

                var formData = $(self.searchForm).serializeObject();

                $(self.searchPage).jqmData('formData', formData);
                $.mobile.changePage( self.searchPage, { transition: 'slide' } );

            }

        },

        validate: function () {

            var error = '';

            if ( this.searchInput.val() === '' ) {
                error = 'Please enter a search term.';
            } else if ( !this.chbTwitter.is(':checked') && !this.chbFacebook.is(':checked') && !this.chbGoogle.is(':checked')) {
                error = 'Please select at least one social network to search.';
            } else if ( !this.chbPeople.is(':checked') && !this.chbPosts.is(':checked') ) {
                error = 'Please select the type of search (people/posts).';
            }

            // if error display dialog
            if (error) {

                $('<div>').simpledialog2({
                    mode: 'blank',
                    headerText: 'Upps, sorry...',
                    blankContent: '<p>' + error + "</p><a rel='close' data-role='button' href='#'>OK</a>"
                });
                return false;
            }

            return true;

        },

        updateAuthenticationStatus: function () {

            var self = this,
                type = $('input:radio[name=type]:checked').val();

            if( type === 'posts' ) {

                self.setStatus( self.imgAuthAll, 'green' );

            } else if ( type === 'people' ) {

                self.setStatus( self.imgAuthGoogle, 'green');

                if( FacebookAuthentication.isAuthenticated() ) {
                    self.setStatus( self.imgAuthFacebook, 'green' );
                } else {
                    self.setStatus( self.imgAuthFacebook, 'red' );
                }

                if( TwitterAuthentication.isAuthenticated() ) {
                    self.setStatus( self.imgAuthTwitter, 'green' );
                } else {
                    self.setStatus( self.imgAuthTwitter, 'red' );
                }

            }

        },

        setStatus: function( elems, status ) {

            $.each(elems, function( i, obj ) {
                $(obj, this.searchForm).attr('src', 'img/circle_' + status + '.png');
            });            

        }

    };



    /*****************/
    /*  SEARCH PAGE  */
    /*****************/
    var SearchPage = {

        init: function() {

            this.cacheElements();
            this.bindEvents();

        },

        cacheElements: function() {

            this.searchPage = $('div#search');
            this.searchForm = $('#searchForm');
            this.searchInput = $('#searchInput');
            this.twitterList = $('ul#twitterList');
            this.facebookList = $('ul#facebookList');
            this.googleList = $('ul#googleList');

        },

        bindEvents: function () {

            var self = this;

            // user submits search form on search page
            $(self.searchForm).on('submit', function (e) {

                e.preventDefault();

                $.extend(self.formData, { query: self.searchInput.val() });

                self.clearResults();
                self.search();

            });

            $(self.searchPage).live('pageshow', function () {

                self.initSearch();

            });

            $(self.searchPage).live('pagebeforeshow', function () {

                // emtpy the results list
                self.clearResults();

                self.setDisplayMode();

            });

        },

        setDisplayMode: function () {

            var displayMode = Preferences.getResultsDisplayMode();

            if( displayMode === 'full' ) {
                $(this.twitterList).attr('data-inset', false).removeClass('ui-listview-inset ui-corner-all ui-shadow').listview({'inset': false});
                $(this.facebookList).attr('data-inset', false).removeClass('ui-listview-inset ui-corner-all ui-shadow').listview({'inset': false});
                $(this.googleList).attr('data-inset', false).removeClass('ui-listview-inset ui-corner-all ui-shadow').listview({'inset': false});
            } else if ( displayMode === 'inset') {
                $(this.twitterList).attr('data-inset', true).addClass('ui-listview-inset ui-corner-all ui-shadow').listview({'inset': true});
                $(this.facebookList).attr('data-inset', true).addClass('ui-listview-inset ui-corner-all ui-shadow').listview({'inset': true});
                $(this.googleList).attr('data-inset', true).addClass('ui-listview-inset ui-corner-all ui-shadow').listview({'inset': true});
            }

        },

        initSearch: function() {

            // update form data
            this.formData = $(this.searchPage).jqmData('formData');

            if( this.formData !== undefined ) {

                this.setSearchInfo();
                this.search();

            } else {

                $('<div>').simpledialog2({ 
                    mode: 'blank',
                    headerText: 'Upps, sorry...',
                    blankContent: "<p>Please go back to the home page.</p><a rel='close' data-role='button' href='#home'>Take me there!</a>"
                });

            }

        },

        setSearchInfo: function() {

            // set search value to input field
            $(this.searchInput).val( this.formData.query );

            $('span#searchType').text( this.formData.type );

            var frag = (this.formData.twitter ? "<img height='20' width='20' src='img/twitter_icon.png' alt='Twitter' />" : '');
            frag += (this.formData.facebook ? "<img height='20' width='20' src='img/facebook_icon.png' alt='Facebook' />" : '');
            frag += (this.formData.google ? "<img height='20' width='20' src='img/google_icon.png' alt='Google' />" : '');

            $('span#searchPlatform').html( frag );

        },

        search: function() {   

            if( this.validate() ) {

                // kick off search for selected networks
                if( this.formData.twitter ) {
                    Twitter.init( this.formData );
                }

                if( this.formData.facebook ) {
                    Facebook.init( this.formData );
                }

                if( this.formData.google ) {
                    Google.init( this.formData );
                }

                RecentQueries.add( this.formData );

            }

        },

        validate: function () {

            if (this.formData.query === '') {

                $('<div>').simpledialog2({ 
                    mode: 'blank',
                    headerText: 'Upps, sorry...',
                    blankContent: "<p>Please enter a search term.</p><a rel='close' data-role='button' href='#'>OK</a>"
                });
                return false;
            }

            return true;

        },

        clearResults: function () {

            $(this.twitterList).empty().hide();
            $(this.facebookList).empty().hide();
            $(this.googleList).empty().hide();

        }

    };



    /*********************/
    /*  TRENDING TOPICS  */
    /*********************/
    var TrendingTopics = {

        init: function() {

            this.cacheElements();
            this.bindEvents();
            this.topics = [];

            this.updateDefaultState();

        },

        cacheElements: function() {

            this.trendingTopicsWrapper = $('div#trendingTopicsWrapper');
            this.trendingTopicsList = $('ul#trendingTopicsList');
            this.homePage = $('div#home');
            this.searchPage = $('div#search');

        },

        bindEvents: function() {

            var self = this;

            // user expands the trending topics list
            $(self.trendingTopicsWrapper).bind('expand', function() {
                self.requestTopics();
            });

            // user clicks a trending topic
            $(self.trendingTopicsList).on('click', 'a.search', function ( e ) {
                e.preventDefault();
                self.startSearch( $(e.target).text() );
            });

        },

        requestTopics: function() {

            var self = this;

            $.when( this.fetchData() ).then(function () {

                self.attachData();

            }, function() { self.fetchError(); });

        },

        startSearch: function( q ) {

            var formData = { 'twitter': 'on', 'type': 'posts', 'query': q };

            $(this.searchPage).jqmData('formData', formData);
            $.mobile.changePage( this.searchPage, { transition: 'slide' } );

        },

        fetchData: function() {            

            var self = this;

            return $.ajax({
                url: 'https://api.twitter.com/1/trends/1.json',
                beforeSend: function() { $(self.trendingTopicsList).html("<li><img src='img/ajax_loader.gif' width='32' heigt='32' alt='Loading...' /></li>"); },
                success: function (data) {

                    self.topics = $.map(data[0].trends, function (topic) {
                        return topic.name;
                    });

                }

            });

        },

        fetchError: function () {

            $(this.trendingTopicsList).empty();
            $(this.trendingTopicsWrapper).trigger('collapse');
            
            $('<div>').simpledialog2({
                mode: 'blank',
                headerText: 'Upps, sorry...',
                blankContent: "<p>Trending topics could not be loaded. Please try again.</p><a rel='close' data-role='button' href='#'>OK</a>"
            });

        },

        attachData: function () {  

            var self = this,
                frag = '';

            $(self.topics).each(function(obj, topic) {

                frag += "<li><img class='twitterThumbnail' height='20' width='20' src='img/twitter_icon.png' alt='Twitter' /><a class='search' href='#'>" + topic + "</a></li>";

            });

            $(self.trendingTopicsList).html(frag).listview('refresh');

        },

        updateDefaultState: function() {

            var defaultState = Preferences.getTrendingTopicsDefault();

            if( defaultState === 'open' ) {
                $(this.trendingTopicsWrapper).trigger('expand');
            } else if( defaultState === 'closed' ) {
                $(this.trendingTopicsWrapper).trigger('collapse');
            }

        }

    };



    /********************/
    /*  RECENT QUERIES  */
    /********************/
    var RecentQueries = {

        storage_label: 'recent_queries',

        init: function () {

            var self = this;

            self.cacheElements();
            self.bindEvents();

            self.queries = amplify.store( this.storage_label ) || [];

        },

        cacheElements: function () {

            this.homePage = $('div#home');
            this.searchPage = $('div#search');
            this.recentQueriesList = $('ul#recentQueries');
            this.listHeader = $('li#recentQueriesHeader');

        },

        bindEvents: function () {

            var self = this;

            // user clicks a recent query
            $(self.recentQueriesList).on('click', 'a.search', function ( e ) {
                e.preventDefault();
                self.startSearch( e );
            });

            // user deletes recent query
            $(self.recentQueriesList).on('click', 'a.remove', function (e) {
                e.preventDefault();
                self.remove( e );
            });

            // refresh recent queries list before every page load
            $(self.homePage).live('pagebeforeshow', function() {
                self.refresh();
            });

        },

        startSearch: function ( e ) {

            var self = this;

            // get 'json' attribute of clicked query
            var formData = $(e.target).jqmData('json');

            $(self.searchPage).jqmData('formData', formData);
            $.mobile.changePage( self.searchPage, { transition: 'slide' } );

        },

        add: function( q ) {

            // get currently stored queries
            this.queries = amplify.store( this.storage_label ) || [];

            // check if query already exists
            var exists = $.grep(this.queries, function(obj) {            
                return JSON.stringify(obj) === JSON.stringify(q);
            });

            // if not, prepend to array and update client storage
            if (exists.length === 0) {

                this.queries.unshift( q );
                amplify.store( this.storage_label, this.queries);

            }            

        },

        remove: function ( e ) {

            var self = this,
                $target = $(e.target);

            // fade out li
            $target.closest('li').fadeOut(500, function () {

                // re-adjust css properties
                $(self.recentQueriesList).listview('refresh');

                // get 'json' attribute of clicked query
                var toDelete = $target.closest('li').find('a.search').jqmData('json');

                // remove query from array
                self.queries = $.grep(self.queries, function (obj) {
                    return JSON.stringify(obj) !== JSON.stringify(toDelete);
                });

                // if no more recent queries available, clear client storage entirely
                if (self.queries.length === 0) {
                    self.flush();
                    self.listHeader.hide();
                } else {
                    // update client storage
                    amplify.store( self.storage_label, self.queries);
                }

            });

        },

        refresh: function () {

            var self = this;

            // clear list (except header)
            $(self.recentQueriesList).children('li').not(self.listHeader).remove();       

            // check limits for recent queries, slice array if necessary
            var limit = Preferences.getRecentQueriesLimit();
            if ( self.queries.length > limit ) {
                self.queries = self.queries.slice( 0, limit );
            }       

            // if still queries available, append them to the list
            if( self.queries.length > 0 ) {   

                var deleteMode = Preferences.getRecentQueriesDeleteMode();      

                var frag = '';
                $.each(self.queries, function (key, obj) {
                    frag += (deleteMode === 'click' ? '<li>' :  "<li data-swipeurl='#'>");
                    frag += "<div class='type'>";
                    frag += (obj.type === 'people' ? "<img height='20' width='20' src='img/people_icon.png' alt='People' />" : '');
                    frag += (obj.type === 'posts' ? "<img height='20' width='20' src='img/posts_icon.png' alt='Posts' />" : '');
                    frag += "</div><div class='arrow'>&raquo;</div><div class='platforms'>";
                    frag += (obj.twitter ? "<img height='20' width='20' src='img/twitter_icon.png' alt='Twitter' />" : '');
                    frag += (obj.facebook ? "<img height='20' width='20' src='img/facebook_icon.png' alt='Facebook' />" : '');
                    frag += (obj.google ? "<img height='20' width='20' src='img/google_icon.png' alt='Google' />" : '');
                    frag += "</div><a class='search' data-json='" + JSON.stringify(obj) + "' href='#'>" + obj.query + "</a>";
                    frag += (deleteMode === 'click' ? "<a class='remove' href='#'></a>" : '');
                    frag += "</li>";
                });
                $(self.recentQueriesList).append(frag);
                // show list header
                $(self.listHeader).show();

            } else { // no queries available

                // hide list header and clear client storage entirely 
                $(self.listHeader).hide();
                self.flush();

            }

            // rebuild the list to attach CSS
            $(self.recentQueriesList).show().listview('refresh', true);

            // bind swipe events to newly added items
            if( Preferences.getRecentQueriesDeleteMode() === 'swipe' ) {

                $('li', self.recentQueriesList).swipeDelete({
                    click: function(e){
                        e.preventDefault();
                        self.remove( e );
                    }
                });

            }

        },

        flush: function () {

            // empty array and clear client storage
            this.queries = [];
            amplify.store(this.storage_label, null);

        }

    };



    /********************/
    /*  TWITTER CLIENT  */
    /********************/
    var Twitter = {

        api_url_posts: 'https://search.twitter.com/search.json',
        api_url_people: 'http://' + window.location.hostname + window.location.pathname + 'php/twitter_search_people.php',

        init: function ( formData ) {

            this.cacheElements();
            this.bindEvents();
            this.setHeader();
            
            this.formData = formData;
            this.searchConfig = {};
            this.json = {};
            this.next_page = 0;

            this.configSearch();
            this.initSearch();

        },

        cacheElements: function () {

            this.templatePosts = Handlebars.compile( $('script#twitterPostsTemplate').html() );
            this.templatePeople = Handlebars.compile( $('script#twitterPeopleTemplate').html() );
            this.twitterList = $('ul#twitterList').show();

        },

        bindEvents: function () {

            var self = this;

            // user clicks the load more button
            $('li.loadMore a', self.twitterList).die('click').live('click', function( e ) {        
                
                if( self.formData.type === 'posts' ) {

                    var url = $(e.target).jqmData('url');
                    var urlData = url.substring( url.indexOf('?') + 1 );
                    $.extend( self.searchConfig.params, $.deserialize( urlData ) );

                    // only reload 5 more tweets
                    self.searchConfig.params.rpp = 5;

                } else if ( self.formData.type === 'people' ) {

                    $.extend( self.searchConfig.params, { 'page': ++self.next_page } );

                    // only reload 5 more tweets
                    self.searchConfig.params.per_page = 5;

                }                

                self.initSearch();

            });

        },

        setHeader: function () {

            var header = $("<li><img height='20' width='20' src='img/twitter_icon.png' alt='Twitter' />Twitter</li>").attr({ 'class': 'divider', 'data-role': 'list-divider' });
            $(this.twitterList).append( header ).listview('refresh');

        },

        configSearch: function() {

            var self = this;

            self.searchConfig.params = { 'q': self.formData.query };

            if ( self.formData.type === 'people' ) {

                self.searchConfig.url = self.api_url_people;
                $.extend( self.searchConfig.params, { 'oauth_token': $.cookie('twitter_oauth_token'), 'oauth_token_secret': $.cookie('twitter_oauth_token_secret'), 'per_page': Preferences.getPeopleResultsPerPageLimit(), 'page': ++self.next_page } );

            } else if ( self.formData.type === 'posts' ) {

                self.searchConfig.url = self.api_url_posts;
                $.extend( self.searchConfig.params, { 'rpp': Preferences.getPostResultsPerPageLimit() } );
                
            }

        },

        initSearch: function () {

            var self = this;

            $.when( self.fetchData() ).then(function () {

                self.attachTemplate();

            }, function ( error ) { self.showError( error ); } );

        },

        fetchData: function () {

            var self = this,
                dfd = $.Deferred();

            $.ajax({
                url: self.searchConfig.url,
                data: self.searchConfig.params,
                dataType: self.formData.type === 'people' ? 'json' : 'jsonp',
                beforeSend: function() { self.showLoadingAnimation(); },
                success: function (data) {

                    console.log('Twitter');
                    console.log(data);
                    
                    if( data.error ) {

                        dfd.reject( data.error.message );

                    } else if( data.results.length === 0 ) { // no tweets found

                        dfd.reject('No ' + self.formData.type + ' found...');

                    } else { // no errors, result contains data

                        if( self.formData.type === 'people' ) {
                            self.parsePeople( data );
                        } else if( self.formData.type === 'posts') {
                            self.parsePosts( data );
                        }

                        dfd.resolve();

                    }

                },
                error: function() {
                    dfd.reject('Twitter did not respond. Please try again.');
                }
                
            });
    
            return dfd.promise();

        },

        parsePeople: function ( data ) {

            this.json.people = $.map(data.results, function ( person ) {

                var rtn = {
                    person_name: person.name,
                    person_screen_name: person.screen_name,
                    person_profile_url: 'https://twitter.com/#!/' + person.screen_name,
                    person_img_url: person.profile_image_url_https,
                    person_description: Utilities.replaceURLWithHTMLLinks( person.description || '- no description -' ),
                    person_verified: person.verified,
                    person_followers_count: Utilities.addCommasToNumber( person.followers_count ),
                    latest_tweet: false
                };

                if( person.status ) {
                    $.extend( rtn, {
                        latest_tweet: true,
                        latest_tweet_text: Utilities.linkifyTweets( person.status.text ),
                        latest_tweet_url: 'https://twitter.com/' + person.screen_name + '/status/' + person.status.id_str,
                        latest_tweet_timestamp: Utilities.standardDateString( new Date(person.status.created_at) ),
                        latest_tweet_timestamp_pretty: Utilities.ISODateString( new Date(person.status.created_at) )   
                    } );
                }

                return rtn;

            });

        },

        parsePosts: function ( data ) {

            this.json.next_page = data.next_page;
            this.json.posts = $.map(data.results, function ( post ) {
                return {
                    author_name: post.from_user,
                    author_profile_url: 'https://twitter.com/#!/' + post.from_user,
                    author_img_url: post.profile_image_url,
                    post_text: Utilities.linkifyTweets( post.text ),                            
                    post_url: 'https://twitter.com/' + post.from_user + '/status/' + post.id_str,                            
                    post_reply_url: 'https://twitter.com/intent/tweet?in_reply_to=' + post.id_str,
                    post_retweet_url: 'https://twitter.com/intent/retweet?tweet_id=' + post.id_str,
                    post_favourite_url: 'https://twitter.com/intent/favorite?tweet_id=' + post.id_str,
                    post_timestamp: Utilities.standardDateString( new Date( post.created_at ) ),
                    post_timestamp_pretty: Utilities.ISODateString( new Date( post.created_at ) )
                };
            });

        },

        showLoadingAnimation: function () {

            var loadingAnimation = $("<li class='loadingAnimation'><img src='img/ajax_loader.gif' width='32' height='32' alt='Loading...' /></li>"),
                loadMore = $(this.twitterList).find('li.loadMore');

            if( $( loadMore ).length > 0 ) {
                $( loadMore ).before( loadingAnimation );
            } else {
                $(this.twitterList).append( loadingAnimation );
            }

            $(this.twitterList).listview('refresh');

        },

        showError: function ( error ) {

            // remove loading animation and load more button
            $(this.twitterList).find('li.loadingAnimation').remove();
            $(this.twitterList).find('li.loadMore').remove();

            var errorHtml = '<li class="error"><p>' + error + '</p></li>';
            $(this.twitterList).append( errorHtml );

            $(this.twitterList).listview('refresh');

        },

        attachTemplate: function () {

            // remove loading animation and load more button
            $(this.twitterList).find('li.loadingAnimation, li.loadMore').remove();

            if( this.formData.type === 'people' ) {

                // append people results
                $(this.twitterList).append( this.templatePeople(this.json) );
                // if more people available, add load more button at the end
                if( this.json.people.length === this.searchConfig.params.per_page ) {
                    $(this.twitterList).append("<li data-icon='false' class='loadMore'><a>Gimme mooore " + this.formData.type + "!</a></li>");
                }

            } else if( this.formData.type === 'posts' ) {

                // append post results
                $(this.twitterList).append( this.templatePosts(this.json) );
                // if more posts available, add load more button at the end
                if( this.json.posts.length === this.searchConfig.params.rpp) {
                    $(this.twitterList).append("<li data-icon='false' class='loadMore'><a data-url=" + this.json.next_page + ">Gimme mooore " + this.formData.type + "!</a></li>");
                }  
        
            }    
                    
            // format dates in 'pretty' format
            $("a.timestamp", this.twitterList).prettyDate({attribute: 'alt'});
            $(this.twitterList).listview('refresh');

        }

    };



    /*********************/
    /*  FACEBOOK CLIENT  */
    /*********************/
    var Facebook = {

        api_url_posts: 'https://graph.facebook.com/search?type=post',
        api_url_people: 'https://graph.facebook.com/search?type=user',

        init: function ( formData ) {

            this.cacheElements();
            this.bindEvents();
            this.setHeader();
            this.registerHandlebarsHelpers();
            
            this.formData = formData;
            this.searchConfig = {};
            this.json = {};

            this.configSearch();
            this.initSearch();

        },

        cacheElements: function () {

            this.templatePosts = Handlebars.compile( $('script#facebookPostsTemplate').html() );
            this.templatePeople = Handlebars.compile( $('script#facebookPeopleTemplate').html() );
            this.facebookList = $('ul#facebookList').show();

        },

        bindEvents: function () {

            var self = this;

            // user clicks the load more button
            $('li.loadMore a', self.facebookList).live('click', function( e ) {

                e.preventDefault();
                e.stopImmediatePropagation();

                var url = $(e.target).jqmData('url');
                var urlData = url.substring( url.indexOf('?') + 1 );
                $.extend( self.searchConfig.params, $.deserialize( urlData ) );

                // only reload 5 more posts
                self.searchConfig.params.limit = 5;
                // remove callback pre-defined by Facebook API
                delete self.searchConfig.params.callback;

                self.initSearch();

            });

        },

        setHeader: function () {

            var header = $("<li><img height='20' width='20' src='img/facebook_icon.png' alt='Facebook' />Facebook</li>").attr({ 'class': 'divider', 'data-role': 'list-divider' });
            $(this.facebookList).append( header ).listview('refresh');

        },

        configSearch: function () {

            var self = this;

            self.searchConfig.params = { 'q': self.formData.query };

            if( self.formData.type === 'people' ) {

                self.searchConfig.url = self.api_url_people;
                $.extend(self.searchConfig.params, { 'access_token': $.cookie('fb_access_token'), 'limit': Preferences.getPeopleResultsPerPageLimit() } );

            } else if ( self.formData.type === 'posts' ) {

                self.searchConfig.url = self.api_url_posts;
                $.extend(self.searchConfig.params, { 'limit': Preferences.getPostResultsPerPageLimit() } );

            }

        },

        initSearch: function () {

            var self = this;

            $.when( self.fetchData() ).then(function () {

                self.attachTemplate();

            }, function ( error ) { self.showError( error ); });

        },

        fetchData: function () {

            var self = this,
                dfd = $.Deferred();

            $.ajax({
                url: self.searchConfig.url,
                data: self.searchConfig.params,
                beforeSend: function() { self.showLoadingAnimation(); },
                success: function (data) {

                    console.log('Facebook');
                    console.log(data);

                    if( data.error ) {

                        if( data.error.code === 190 ) {
                            dfd.reject( "You have to authenticate with Facebook to search for people. <a class='linkAuthFacebook' rel='external' data-action='login'>Let's Do It!</a>" );
                        } else {
                            dfd.reject( data.error.message );
                        }

                    } else if( data.data.length === 0 ) {

                        dfd.reject('No ' + self.formData.type + ' found...');

                    } else { // no errors, result contains data

                        if( self.formData.type === 'people' ) {
                            self.parsePeople( data );
                        } else if ( self.formData.type === 'posts' ) {
                            self.parsePosts( data );
                        }

                        dfd.resolve();

                    }

                },
                error: function() {
                    dfd.reject('Facebook did not respond. Please try again.');
                }
            });

            return dfd.promise();

        },

        registerHandlebarsHelpers: function() {

            Handlebars.registerHelper('facebook_post_body', function() {

                var html = '';
                if( this.post_type === 'status') {

                    html = "<span class='text-only'>" + Utilities.replaceURLWithHTMLLinks( this.post_text ) + "</span>";

                } else if ( this.post_type === 'photo' || this.post_type === 'link' || this.post_type === 'video' ) {

                    html = Utilities.replaceURLWithHTMLLinks( this.attachment_message  ) + "<span class='attachment'><img src='" + this.attachment_icon + "' alt='Attachment' />";
                    html += "<strong>" + Utilities.capitalize( this.post_type ) + ":</strong> <a href='" + this.attachment_link + "' rel='external' target='_blank'>" + this.attachment_name + "</a>";
                    html += "<br /><a href='" + this.attachment_link + "' rel='external' target='_blank'><img class='preview' src='" + this.attachment_preview + "' alt='Preview' /></a></span>";
               
                }

                return new Handlebars.SafeString( html );

            });

        },

        parsePeople: function ( data ) {

            this.json.next_page = data.paging.next;
            this.json.people = $.map(data.data, function ( person ) {
                    return {
                        person_name: person.name,
                        person_profile_url: 'https://www.facebook.com/profile.php?id=' + person.id,
                        person_img_url: 'https://graph.facebook.com/' + person.id + '/picture?type=square'             
                    };
            });

        },

        parsePosts: function ( data ) {

            this.json.next_page = data.paging.next;
            this.json.posts = $.map(data.data, function ( post ) {
                var post_url = (post.id).substring( (post.id).indexOf('_') + 1 );
                    return {
                        author_name: post.from.name,
                        author_profile_url: 'https://www.facebook.com/profile.php?id=' + post.from.id,
                        author_img_url: 'https://graph.facebook.com/' + post.from.id + '/picture?type=square',
                        post_type: post.type,
                        post_text: post.message,
                        post_url: 'https://www.facebook.com/permalink.php?story_fbid=' + post_url + '&id=' + post.from.id,
                        post_timestamp: Utilities.standardDateString( new Date( post.created_time ) ),
                        post_timestamp_pretty: post.created_time,
                        attachment_icon: post.icon,
                        attachment_message: post.message || post.story,
                        attachment_name: post.name,
                        attachment_link: post.link || post.source,
                        attachment_preview: post.picture || 'https://graph.facebook.com/' + (post.object_id || post.id) + '/picture?type=album'       
                    };
            });

        },

        showLoadingAnimation: function () {

            var loadingAnimation = $("<li class='loadingAnimation'><img src='img/ajax_loader.gif' width='32' height='32' alt='Loading...' /></li>"),
                loadMore = $(this.facebookList).find('li.loadMore');

            if( $( loadMore ).length > 0 ) {
                $( loadMore ).before( loadingAnimation );
            } else {
                $( this.facebookList ).append( loadingAnimation );
            }

            $(this.facebookList).listview('refresh');

        },

        showError: function ( error ) {

            // remove loading animation
            $(this.facebookList).find('li.loadingAnimation').remove();
            $(this.facebookList).find('li.loadMore').remove();

            var errorHtml = '<li class="error"><p>' + error + '</p></li>';
            $(this.facebookList).append( errorHtml );

            $(this.facebookList).listview('refresh');

        },

        attachTemplate: function () {

            // remove loading animation and load more button
            $(this.facebookList).find('li.loadingAnimation, li.loadMore').remove();

            if( this.formData.type === 'people' ) {

                // append people results
                $(this.facebookList).append( this.templatePeople(this.json) );

            } else if( this.formData.type === 'posts' ) {

                // append post results
                $(this.facebookList).append( this.templatePosts(this.json) );
                // format dates in 'pretty' format
                $("a.timestamp", this.facebookList).prettyDate({attribute: 'alt'});
        
            }

            // if more posts or people available, add load more button at the end
            if( (this.json.people && this.json.people.length === this.searchConfig.params.limit) ||
                (this.json.posts && this.json.posts.length === this.searchConfig.params.limit) ) {
                    $(this.facebookList).append("<li data-icon='false' class='loadMore'><a data-url=" + this.json.next_page + ">Gimme mooore " + this.formData.type + "!</a></li>");
            }           

            $(this.facebookList).listview('refresh');

        }

    };



    /***********************/
    /*  GOOGLEPLUS CLIENT  */
    /***********************/
    var Google = {

        api_url_posts: 'https://www.googleapis.com/plus/v1/activities',
        api_url_people: 'https://www.googleapis.com/plus/v1/people',
        api_key: 'AIzaSyDIPTngvY-Nbc_j2s2l2dU-J1RPx1cBieA',

        init: function ( formData ) {

            this.cacheElements();
            this.bindEvents();
            this.setHeader();
            this.registerHandlebarsHelpers();

            this.formData = formData;
            this.searchConfig = {};
            this.json = {};

            this.configSearch();
            this.initSearch();

        },

        cacheElements: function () {

            this.templatePosts = Handlebars.compile( $('script#googlePostsTemplate').html() );
            this.templatePeople = Handlebars.compile( $('script#googlePeopleTemplate').html() );
            this.googleList = $('ul#googleList').show();

        },

        bindEvents: function () {

            var self = this;

            // user clicks the load more button
            $('li.loadMore a', self.googleList).live('click', function( e ) {

                e.preventDefault();
                e.stopImmediatePropagation();
                
                var url = $(e.target).jqmData('url');
                var urlData = url.substring( url.indexOf('?') + 1 );
                $.extend( self.searchConfig.params, $.deserialize( urlData ), { 'key' : self.api_key } );

                // only reload 5 more posts
                self.searchConfig.params.maxResults = 5;

                self.initSearch();

            });

        },

        setHeader: function () {

            var header = $("<li><img height='20' width='20' src='img/google_icon.png' alt='Google+' />Google+</li>").attr({ 'class': 'divider', 'data-role': 'list-divider' });
            $(this.googleList).append( header ).listview('refresh');

        },

        configSearch: function () {

            this.searchConfig.params = { 'query': this.formData.query, key: this.api_key };

            if( this.formData.type === 'people' ) {
                this.searchConfig.url = this.api_url_people;
                $.extend(this.searchConfig.params, { 'maxResults': Preferences.getPeopleResultsPerPageLimit() } );
            } else if ( this.formData.type === 'posts' ) {
                this.searchConfig.url = this.api_url_posts;
                $.extend(this.searchConfig.params, { 'maxResults': Preferences.getPostResultsPerPageLimit() } );
            }

        },

        initSearch: function () {

            var self = this;            

            $.when( self.fetchData() ).then(function () {

                self.attachTemplate();

            }, function ( error ) { self.showError( error ); } );

        },

        fetchData: function () {

            var self = this,
                dfd = $.Deferred();

            $.ajax({
                url: self.searchConfig.url,
                data: self.searchConfig.params,
                beforeSend: function() { self.showLoadingAnimation(); },
                success: function ( data ) {

                    console.log('Google+');
                    console.log(data);

                    if( data.error ) {

                        dfd.reject( data.error.message + ' (Reason: ' + data.error.errors[0].reason + ')' );

                    } else if( data.items.length === 0 ) {

                        dfd.reject('No ' + self.formData.type + ' found...');

                    } else { // no errors, result contains data

                        if( self.formData.type === 'people' ) {
                            self.parsePeople( data );
                        } else if ( self.formData.type === 'posts' ) {
                            self.parsePosts( data );
                        }

                        dfd.resolve();

                    }

                },
                error: function() {
                    dfd.reject('Google+ did not respond. Please try again.');
                }
                
            });
    
            return dfd.promise();

        },

        registerHandlebarsHelpers: function() {

            Handlebars.registerHelper('google_post_body', function() {

                var content = Utilities.replaceURLWithHTMLLinks( this.post_text ),
                    html = '';

                if( !this.attachments ) {

                    html = "<span class='text-only'>" + ( content || '' ) + "</span>";

                } else {
                    
                    html = ( content || '' );

                    $.each( this.attachments, function( i, obj ) {                        

                        if( obj.objectType === 'article' ) {
                            
                            html += "<span class='attachment'><img src='img/google_article.png' alt='Article' width='18' height='18' />";
                            html += "<strong>Full Article:</strong> <a href='" + obj.url + "' rel='external' target='_blank'>" + obj.displayName + "</a></span>";
                       
                        } else if ( obj.objectType === 'photo' ) {
                            
                            html += "<span class='attachment'><img src='img/google_photo.png' alt='Photo' width='18' height='18' />";
                            html += "<strong>Image:</strong> <a href='" + obj.fullImage.url + "' rel='external' target='_blank'>" + ( obj.displayName || '' );
                            html += "<br /><img class='preview' src='" + obj.image.url + "' alt='Preview' /></a></span></a></span>";                                               
            
                        } else if ( obj.objectType === 'video' ) {

                            html += "<span class='attachment'><img src='img/google_video.png' alt='Video' width='18' height='18' />";
                            html += "<strong>Video:</strong> <a href='" + obj.url + "' rel='external' target='_blank'>" + ( obj.displayName || '' );
                            html += "<br /><img class='preview' src='" + obj.image.url + "' alt='Preview' /></a></span>";

                        }

                    });                    
               
                }

                return new Handlebars.SafeString( html );

            });

        },

        parsePeople: function ( data ) {

            this.json.next_page = data.selfLink + '&pageToken=' + data.nextPageToken;
            this.json.people = $.map(data.items, function ( person ) {
                return {
                    person_name: person.displayName,
                    person_profile_url: person.url,
                    person_img_url: person.image.url             
                };
            });

        },

        parsePosts: function ( data ) {

            this.json.next_page = data.nextLink;
            this.json.posts = $.map(data.items, function ( post ) {
                return {
                    author_name: post.actor.displayName,
                    author_profile_url: post.actor.url,
                    author_img_url: post.actor.image.url,
                    post_text: post.object.content,                            
                    post_url: post.object.url,
                    post_timestamp: Utilities.standardDateString( new Date( post.published ) ),
                    post_timestamp_pretty: Utilities.ISODateString(new Date( post.published ) ),
                    attachments: post.object.attachments              
                };
            });

        },

        showLoadingAnimation: function () {

            var loadingAnimation = $("<li class='loadingAnimation'><img src='img/ajax_loader.gif' width='32' height='32' alt='Loading...' /></li>"),
                loadMore = $(this.googleList).find('li.loadMore');

            if( $( loadMore ).length > 0 ) {
                $( loadMore ).before( loadingAnimation );
            } else {
                $( this.googleList ).append( loadingAnimation );
            }

            $(this.googleList).listview('refresh');

        },

        showError: function ( error ) {

            // remove loading animation
            $(this.googleList).find('li.loadingAnimation').remove();
            $(this.googleList).find('li.loadMore').remove();

            var errorHtml = '<li class="error"><p>' + error + '</p></li>';
            $(this.googleList).append( errorHtml );

            $(this.googleList).listview('refresh');

        },

        attachTemplate: function () {

            // remove loading animation and load more button
            $(this.googleList).find('li.loadingAnimation, li.loadMore').remove();

            if( this.formData.type === 'people' ) {

                // append people results
                $(this.googleList).append( this.templatePeople(this.json) );

            } else if( this.formData.type === 'posts' ) {

                // append post results
                $(this.googleList).append( this.templatePosts(this.json) );
                // format dates in 'pretty' format
                $("a.timestamp", this.googleList).prettyDate({attribute: 'alt'});
        
            }

            $(this.googleList).append("<li data-icon='false' class='loadMore'><a data-url=" + this.json.next_page + ">Gimme mooore " + this.formData.type + "!</a></li>");

            $(this.googleList).listview('refresh');
        }

    };



    /*****************/
    /*  PREFERENCES  */
    /*****************/
    var Preferences = {

        storage_label: 'preferences',

        defaults: {
            recent_queries_limit: 5,
            recent_queries_delete_mode: 'click',
            posts_per_page: 5,
            people_per_page: 5,
            trending_topics_default_state: 'closed',            
            results_display_mode: 'inset'
        },

        init: function () {

            this.bindEvents();

            // get current preferences
            var prefs = this.getAllPreferences();

            // display current preferences
            $('div#preferences input#recent' + prefs.recent_queries_limit).attr('checked', true).checkboxradio('refresh');
            $('div#preferences input#postspp' + prefs.posts_per_page).attr('checked', true).checkboxradio('refresh');            
            $('div#preferences input#peoplepp' + prefs.people_per_page).attr('checked', true).checkboxradio('refresh');            
            $('div#preferences input#tt' + prefs.trending_topics_default_state).attr('checked', true).checkboxradio('refresh');
            $('div#preferences input#rqmode' + prefs.recent_queries_delete_mode).attr('checked', true).checkboxradio('refresh');
            $('div#preferences input#resmode' + prefs.results_display_mode).attr('checked', true).checkboxradio('refresh');

        },

        bindEvents: function () {

            var self = this;

            // user changes number of recent queries
            $('div#preferences input[name=radioRecentQueries]').on('change', function (e) {
                self.updateRecentQueriesLimit( e );
            });

            // user changes number of post results per page
            $('div#preferences input[name=radioPostResultsPerPage]').on('change', function (e) {
                self.updatePostResultsPerPageLimit( e );
            });

            // user changes number of people results per page
            $('div#preferences input[name=radioPeopleResultsPerPage]').on('change', function (e) {
                self.updatePeopleResultsPerPageLimit( e );
            });

            // user changes default state of trending topics
            $('div#preferences input[name=radioTrendingTopics]').on('change', function (e) {
                self.updateTrendingTopicsDefaultState( e );
            });

            // user changes recent queries delete mode
            $('div#preferences input[name=radioRecentQueriesDeleteMode]').on('change', function (e) {
                self.updateRecentQueriesDeleteMode( e );
            });

            // user changes results display mode
            $('div#preferences input[name=radioResultsDisplayMode]').on('change', function (e) {
                self.updateResultsDisplayMode( e );
            });

            // user clicks reset button
            $('div#preferences #btnResetPrefs').live('click', function () {

                // reset all settings to defaults
                self.reset();
                $('<div>').simpledialog2({
                    mode: 'blank',
                    headerText: 'Hurray!',
                    blankContent: "<p>Preferences reset to default.</p><a rel='close' data-role='button' href='#'>OK</a>"
                });

            });

            // user clicks clear recent queries button
            $('div#preferences #btnClearQueries').live('click', function () {

                // clear recent queries list and show confirmation dialog
                RecentQueries.flush();
                $('<div>').simpledialog2({
                    mode: 'blank',
                    headerText: 'Hurray!',
                    blankContent: "<p>Recent queries cleared.</p><a rel='close' data-role='button' href='#'>OK</a>"
                });

            });

        },

        getAllPreferences: function () { 

            return $.extend({}, this.defaults, amplify.store(this.storage_label));

        },

        getPostResultsPerPageLimit: function () {

            return this.getAllPreferences().posts_per_page;

        },

        getPeopleResultsPerPageLimit: function () {

            return this.getAllPreferences().people_per_page;

        },

        getRecentQueriesLimit: function () {

            return this.getAllPreferences().recent_queries_limit;

        },

        getTrendingTopicsDefault: function () {

            return this.getAllPreferences().trending_topics_default_state;

        },

        getRecentQueriesDeleteMode: function () {

            return this.getAllPreferences().recent_queries_delete_mode;

        },

        getResultsDisplayMode: function () {

            return this.getAllPreferences().results_display_mode;

        },

        updateRecentQueriesLimit: function (e) {

            this.updatePreferences({
                recent_queries_limit: parseInt( $(e.target).val(), 10 )
            });

        },

        updatePostResultsPerPageLimit: function (e) {

            this.updatePreferences({
                posts_per_page: parseInt( $(e.target).val(), 10 )
            });

        },

        updatePeopleResultsPerPageLimit: function (e) {

            this.updatePreferences({
                people_per_page: parseInt( $(e.target).val(), 10 )
            });

        },

        updateTrendingTopicsDefaultState: function (e) {

            this.updatePreferences({
                trending_topics_default_state: $(e.target).val()
            });
            // update needs to be triggered immediately
            TrendingTopics.updateDefaultState();

        },

        updateRecentQueriesDeleteMode: function (e) {

            this.updatePreferences({
                recent_queries_delete_mode: $(e.target).val()
            });

        },

        updateResultsDisplayMode: function (e) {

            this.updatePreferences({
                results_display_mode: $(e.target).val()
            });

        },

        updatePreferences: function (prefs) {
            
            // get store for preferences from client storage
            var existingStore = amplify.store(this.storage_label);

            // if no store available, create new empty store
            var store = existingStore || {};

            // update store in client storage
            $.extend(store, prefs);
            amplify.store(this.storage_label, store);

        },

        reset: function () {

            // clear current user selection
            $('div#preferences input:radio').removeAttr('checked').checkboxradio('refresh');

            // set default selection
            $('div#preferences input#recent' + this.defaults.recent_queries_limit).attr('checked', true).checkboxradio('refresh');
            $('div#preferences input#postspp' + this.defaults.posts_per_page).attr('checked', true).checkboxradio('refresh');
            $('div#preferences input#peoplepp' + this.defaults.people_per_page).attr('checked', true).checkboxradio('refresh');
            $('div#preferences input#tt' + this.defaults.trending_topics_default_state).attr('checked', true).checkboxradio('refresh');
            $('div#preferences input#rqmode' + this.defaults.recent_queries_delete_mode).attr('checked', true).checkboxradio('refresh');
            $('div#preferences input#resmode' + this.defaults.results_display_mode).attr('checked', true).checkboxradio('refresh');

            // clear client storage
            this.flush();

        },

        flush: function () {

            amplify.store(this.storage_label, null);

        }
    };



    /****************************/
    /*  TWITTER AUTHENTICATION  */
    /****************************/
    var TwitterAuthentication = {

        init: function() {

            this.cacheElements();
            this.bindEvents();

        },

        cacheElements: function() {

            this.authPage = $('div#twitterAuth');
            this.welcomeUser = $('p.user', this.authPage);
            this.btnAuthTwitter = $('a#btnAuthTwitter');
            this.labelBtnAuthTwitter = $('span.label', this.btnAuthTwitter);
            this.userAuthTwitter = $('span#twitterUser');
            this.userLogOutTwitter = $('p.user', 'div#twitterLogOut');
            this.allAuthTwitter = $('a.linkAuthTwitter');

        },

        bindEvents: function() {

            var self = this;

            $(self.allAuthTwitter).live('vclick', function( e ) {

                e.preventDefault();

                var action = $(e.target).closest('a').jqmData('action');

                if( action === 'login' ) {
                    self.login();
                } else if ( action === 'logout' ) {
                    self.logout();
                }               

            });

            $(self.authPage).live('pagebeforeshow', function() {

                self.setAuthResult();

            });

        },

        isAuthenticated: function() {

            if( $.cookie('twitter_oauth_token') && $.cookie('twitter_oauth_token_secret') ) {
                return true;
            } else {
                return false;
            }

        },

        checkAuthState: function() {

            if( this.isAuthenticated() ) {

                var html =  "<a href='https://twitter.com/#!/" + $.cookie('twitter_user_name') + "' rel='external' target='_blank'>";
                    html += "<img src='" + $.cookie('twitter_user_image_url') + "' alt='User' height='50' width='50' /></a>";
                    html += "<span><a class='profileLink' href='https://twitter.com/#!/" + $.cookie('twitter_user_name') + "' rel='external' target='_blank'>" + Utilities.getDecodedCookie('twitter_user_name') + "</a></span>";
                $(this.userAuthTwitter).html( html );
                $(this.labelBtnAuthTwitter).closest('a').jqmData('action', 'logout');
                $(this.labelBtnAuthTwitter).text('Log me out'); 

            } else {

                $(this.userAuthTwitter).empty();
                $(this.labelBtnAuthTwitter).closest('a').jqmData('action', 'login');
                $(this.labelBtnAuthTwitter).text('Auth with Twitter');

            }

        },

        setAuthResult: function() {

            var self = this;

            if( self.isAuthenticated() ) {

                $('div#twitterAuth div.authError').hide();
                $('div#twitterAuth div.authOK').show();

                var html =  "<a href='https://twitter.com/#!/" + $.cookie('twitter_user_name') + "' rel='external' target='_blank'>";
                    html += "<img src='" + $.cookie('twitter_user_image_url') + "' alt='User' height='48' width='48' /></a>";
                    html += "<span>Hello <a class='profileLink' href='https://twitter.com/#!/" + $.cookie('twitter_user_name') + "' rel='external' target='_blank'>" + Utilities.getDecodedCookie('twitter_user_name') + "</a></span>";
                $(self.welcomeUser).html( html );

            } else {

                $('div#twitterAuth div.authError').show();
                $('div#twitterAuth div.authOK').hide();

            }

        },

        login: function() {

            $.oauthpopup({
                path: 'php/twitter_auth.php',
                callback: function() {
                    $.mobile.changePage('#twitterAuth');
                    HomePage.updateAuthenticationStatus();   
                }
            });

        },

        logout: function() {

            var self = this;

            $.ajax({
                url: 'php/twitter_sign_out.php',
                beforeSend: function() {
                    var html =  "<a href='https://twitter.com/#!/" + $.cookie('twitter_user_name') + "' rel='external' target='_blank'>";
                        html += "<img src='" + $.cookie('twitter_user_image_url') + "' alt='User' height='48' width='48' /></a>";
                        html += "<span><a class='profileLink' href='https://twitter.com/#!/" + $.cookie('twitter_user_name') + "' rel='external' target='_blank'>" + Utilities.getDecodedCookie('twitter_user_name') + "</a></span>";
                    $(self.userLogOutTwitter).html( html );
                },
                complete: function() {
                    $.mobile.changePage('#twitterLogOut');
                    HomePage.updateAuthenticationStatus();   
                }
            });       

        }

    };



    /*****************************/
    /*  FACEBOOK AUTHENTICATION  */
    /*****************************/
    var FacebookAuthentication = {

        storage_label: 'authentication',
        app_id: '366208186750691',
        
        init: function () {

            this.cacheElements();
            this.bindEvents();

        },

        cacheElements: function() {

            this.authPage = $('div#facebookAuth');
            this.welcomeUser = $('p.user', this.authPage);
            this.btnAuthFacebook = $('a#btnAuthFacebook');
            this.labelBtnAuthFacebook = $('span.label', this.btnAuthFacebook);
            this.userAuthFacebook = $('span#facebookUser');
            this.userLogOutFacebook = $('p.user', 'div#facebookLogOut');
            this.allAuthFacebook = $('a.linkAuthFacebook');

        },

        bindEvents: function () {

            var self = this;

            $(self.allAuthFacebook).live('vclick', function ( e ) {

                e.preventDefault();
                
                var action = $(e.target).closest('a').jqmData('action');

                if( action === 'login' ) {
                    self.login();
                } else if ( action === 'logout' ) {
                    self.logout();
                }

            });

            $(self.authPage).live('pagebeforeshow', function() {

                self.setAuthResult();

            });

        },

        isAuthenticated: function() {

            if( $.cookie('fb_access_token') ) {
                return true;
            } else {
                return false;
            }

        },

        checkAuthState: function() {

            if( this.isAuthenticated() ) {

                var html =  "<a href='https://www.facebook.com/profile.php?id=" + $.cookie('fb_user_id') + "' rel='external' target='_blank'>";
                    html += "<img src='https://graph.facebook.com/" + $.cookie('fb_user_id') + "/picture?type=square' alt='User' height='50' width='50' /></a>";
                    html += "<span><a class='profileLink' href='https://www.facebook.com/profile.php?id=" + $.cookie('fb_user_id') + "' rel='external' target='_blank'>" + Utilities.getDecodedCookie('fb_user_name') + "</a></span>";
                $(this.userAuthFacebook).html( html );
                $(this.labelBtnAuthFacebook).closest('a').jqmData('action', 'logout');
                $(this.labelBtnAuthFacebook).text('Log me out');

            } else {

                $(this.userAuthFacebook).empty();
                $(this.labelBtnAuthFacebook).closest('a').jqmData('action', 'login');
                $(this.labelBtnAuthFacebook).text('Auth with Facebook');

            }

        },

        setAuthResult: function() {

            var self = this;

            if( self.isAuthenticated() ) {

                $('div#facebookAuth div.authError').hide();
                $('div#facebookAuth div.authOK').show();

                var html =  "<a href='https://www.facebook.com/profile.php?id=" + $.cookie('fb_user_id') + "' rel='external' target='_blank'>";
                    html += "<img src='https://graph.facebook.com/" + $.cookie('fb_user_id') + "/picture?type=square' alt='User' height='50' width='50' /></a>";
                    html += "<span>Hello <a class='profileLink' href='https://www.facebook.com/profile.php?id=" + $.cookie('fb_user_id') + "' rel='external' target='_blank'>" + Utilities.getDecodedCookie('fb_user_name') + "</a></span>";
                $(self.welcomeUser).html( html );

            } else {

                $('div#facebookAuth div.authError').show();
                $('div#facebookAuth div.authOK').hide();

            }

        },

        login: function() {

            $.oauthpopup({
                path: 'php/facebook_auth.php',
                callback: function() {
                    $.mobile.changePage('#facebookAuth');
                    HomePage.updateAuthenticationStatus();   
                }
            });            

        },

        logout: function() {

            var self = this;

            $.ajax({
                url: 'php/facebook_sign_out.php',
                beforeSend: function() {
                    var html =  "<a href='https://www.facebook.com/profile.php?id=" + $.cookie('fb_user_id') + "' rel='external' target='_blank'>";
                        html += "<img src='https://graph.facebook.com/" + $.cookie('fb_user_id') + "/picture?type=square' alt='User' height='50' width='50' /></a>";
                    html += "<span><a class='profileLink' href='https://www.facebook.com/profile.php?id=" + $.cookie('fb_user_id') + "' rel='external' target='_blank'>" + Utilities.getDecodedCookie('fb_user_name') + "</a></span>";
                    $(self.userLogOutFacebook).html( html );
                },
                complete: function() {
                    $.mobile.changePage('#facebookLogOut');
                    HomePage.updateAuthenticationStatus();   
                }
            });  

        }

    };



    /***************/
    /*  UTILITIES  */
    /***************/
    var Utilities = {

        standardDateString: function( d ) {

            var months = new Array("January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December");

            var curr_month = d.getMonth();
            var curr_year = d.getFullYear();
            var curr_date = d.getDate();

            var sup = "";
            if (curr_date === 1 || curr_date === 21 || curr_date === 31) {
               sup = "st";
            } else if (curr_date === 2 || curr_date === 22) {
               sup = "nd";
            } else if (curr_date === 3 || curr_date === 23) {
               sup = "rd";
            } else {
               sup = "th";
            }
            
            return curr_date + sup + ' ' + months[curr_month] + ' ' + curr_year;

        },

        ISODateString: function( d ) {
            
            return d.getUTCFullYear() + '-' + this.pad(d.getUTCMonth()+1) + '-' + this.pad(d.getUTCDate())+'T' + this.pad(d.getUTCHours())+':' + this.pad(d.getUTCMinutes())+':' + this.pad(d.getUTCSeconds())+'Z';

        },

        pad: function( n ){

            return n<10 ? '0'+n : n;

        },

        addCommasToNumber: function( nStr ) {

              nStr += '';
              var x = nStr.split('.');
              var x1 = x[0];
              var x2 = x.length > 1 ? '.' + x[1] : '';
              var rgx = /(\d+)(\d{3})/;
              while (rgx.test(x1)) {
                x1 = x1.replace(rgx, '$1' + ',' + '$2');
              }
              return x1 + x2;

        },

        replaceURLWithHTMLLinks: function(text) {

            var exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
            return text.replace(exp,"<a href='$1' rel='external' target='_blank'>$1</a>");

        },

        linkifyTweets: function( t ) {

            var tweet = t.replace(/[A-Za-z]+:\/\/[A-Za-z0-9-_]+\.[A-Za-z0-9-_:%&\?\/.=]+/g, function(url) { 
                var wrap = document.createElement('div');
                var anch = document.createElement('a');
                anch.href = url;
                anch.target = "_blank";
                anch.innerHTML = url;
                wrap.appendChild(anch);
                return wrap.innerHTML;
            });
            tweet = tweet.replace(/(^|\s|[^\w\d])@([\wáéíóú]+)/gi, '$1@<a class="twitterLink" rel="external" target="_blank" href="https://twitter.com/#!/$2">$2</a>');
            return tweet.replace(/(^|\s|[^\w\d])#([\wáéíóú]+)/gi, '$1#<a class="twitterLink" rel="external" target="_blank" href="https://search.twitter.com/search?q=%23$2">$2</a>');
        },

        capitalize: function( str ) {

            var rtn = str.toLowerCase().replace(/\b[a-z]/g, function(letter) {
                return letter.toUpperCase();
            });
            return rtn;

        },

        getDecodedCookie: function( c ) {

            var s = $.cookie(c, {raw: true});
            return s ? decodeURIComponent(s.replace(/\+/g, ' ')) : s;

        }

    };



    /***************************/
    /*  WHEN HOME IS READY...  */
    /***************************/
    $('#home').live('pageinit', function () {

        // initialise home search form
        HomePage.init();        

        // initialise trending topics
        TrendingTopics.init();

        // initialise recent query list
        RecentQueries.init();

        // initialise Facebook authentication
        FacebookAuthentication.init();

        // initialise Twitter authentication
        TwitterAuthentication.init();

    });



    /*********************************/
    /*  WHEN SEARCHPAGE IS SHOWN...  */
    /*********************************/
    $('#search').live('pageinit', function () {

        // initialise main search form
        SearchPage.init();

    });



    /*****************************/
    /*  WHEN PREFS ARE READY...  */
    /*****************************/
    $('#preferences').live('pageinit', function () {

        // initialise preferences form
        Preferences.init();

    });

})(jQuery, window, document);