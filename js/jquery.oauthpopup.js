(function(jQuery){
    var width = 800;
    var height = 400;
    var left = (screen.width/2)-(width/2);
    var top = (screen.height/2)-(height/2);
    //  inspired by DISQUS
    jQuery.oauthpopup = function(options) {
        options.windowName = options.windowName ||  'ConnectWithOAuth'; // should not include space for IE
        options.windowOptions = options.windowOptions || 'location=0,status=0,width='+width+',height='+height+',top='+top+',left='+left;
        options.callback = options.callback || function(){ window.location.reload(); };
        var that = this;

        that._oauthWindow = window.open(options.path, options.windowName, options.windowOptions);

        that._oauthInterval = window.setInterval(function() {
            if (that._oauthWindow.closed) {
                window.clearInterval(that._oauthInterval);
                options.callback();
            }
        }, 200);
    };
})(jQuery);