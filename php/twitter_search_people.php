<?php

	require_once 'EpiCurl.php';
	require_once 'EpiOAuth.php';
	require_once 'EpiTwitter.php';
	require_once 'twitter_keys.php';

	if( $_GET['oauth_token'] === 'null' || $_GET['oauth_token_secret'] === 'null' ) {

	    echo json_encode( array( 'error' => array( 'message' => "You have to authenticate with Twitter to search for people. <a class='linkAuthTwitter' rel='external' data-action='login'>Let's Do It!</a>" ) ) );
	    exit;

	}

	try {

	    $Twitter = new EpiTwitter( TWITTER_CONSUMER_KEY, TWITTER_CONSUMER_SECRET );
	    $Twitter->setToken( $_GET['oauth_token'], $_GET['oauth_token_secret'] );
	    unset($_GET['oauth_token']);
	    unset($_GET['oauth_token_secret']);
	    $result = $Twitter->get_usersSearch( $_GET );

	} catch (Exception $e) {

	    echo 'api_error';
	    exit;

	}

	$data = array( 'results' => $result->response );
	echo json_encode($data);

?>