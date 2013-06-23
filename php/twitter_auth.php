<?php

	require_once 'EpiCurl.php';
	require_once 'EpiOAuth.php';
	require_once 'EpiTwitter.php';
	require_once 'twitter_keys.php';

	$Twitter = new EpiTwitter(TWITTER_CONSUMER_KEY, TWITTER_CONSUMER_SECRET);

	if( isset( $_GET['denied'] ) ) {

		echo("<script>window.close();</script>");
		exit;

	}


	if( !isset( $_GET['oauth_token'] ) ) {

		$url = $Twitter->getAuthenticateUrl();
		header( 'Location: ' . $url );
		exit;

	}


	if( isset( $_GET['oauth_token'] ) || (isset( $_COOKIE['oauth_token'] ) && isset( $_COOKIE['oauth_token_secret'] ) ) ) {
		
		// user accepted access
		if( !isset( $_COOKIE['oauth_token'] ) || !isset( $_COOKIE['oauth_token_secret'] ) ) {

			// user comes from twitter
		    $Twitter->setToken( $_GET['oauth_token'] );
			$token = $Twitter->getAccessToken();
			$Twitter->setToken($token->oauth_token, $token->oauth_token_secret);

			setcookie('twitter_oauth_token', $token->oauth_token, null, '/');
			setcookie('twitter_oauth_token_secret', $token->oauth_token_secret, null, '/');

		} else {
		
			// user switched pages and came back or got here directly, stilled logged in
			$Twitter->setToken( $_COOKIE['oauth_token'], $_COOKIE['oauth_token_secret'] );
		}

		$result = $Twitter->get_accountVerify_credentials();	
		setcookie('twitter_user_name', $result->screen_name, null, '/');
		setcookie('twitter_user_image_url', $result->profile_image_url, null, '/');

		echo("<script>window.close();</script>");

	}

?>