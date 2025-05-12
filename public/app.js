const fetchConfig = () => fetch("/config.json");

let page = null;
let auth0Client = null;
let isAuthenticated = null;
let config = null;
let user = null;

let requestForm = null;

window.onload = async () => {

    // load the config from config.json in this directory
    const response = await fetchConfig();
    config = await response.json();

    // set the action of the request form, based on what's in the config.json file
    requestForm = document.getElementById("requestForm");
    requestForm.action = `${config.instance}/navpage.do?redirect_uri=sp&failure_uri=sp`;

    // configure the Auth0 client
    auth0Client = await auth0.createAuth0Client({
        domain: config.domain,
        clientId: config.clientId
    });

    let query = window.location.search;
    let isInitialLogin = query.includes("code=") && query.includes("state=");

    // check if we're coming back from an Auth0 redirect
    if (isInitialLogin) {
        await auth0Client.handleRedirectCallback();
        window.history.replaceState({}, document.title, "/");
    }

    // check if we're authenticated
    isAuthenticated = await auth0Client.isAuthenticated();

    if (isAuthenticated) {

        // load the details of the user
        user = await auth0Client.getUser();

        // auth with ServiceNow only needed if it's initial login
        // if it's not initial login, we can assume this has already
        // happened.
        if (isInitialLogin) {

            // get an access token
            let accessToken = await auth0Client.getTokenSilently({
                authorizationParams: {
                    audience: config.instanceClientId,
                }
            });

            // place the access token in a hidden input
            var hiddenInput = document.createElement("input");
            hiddenInput.type = "hidden";
            hiddenInput.name = "X_USER_TOKEN";
            hiddenInput.value = accessToken;
            requestForm.appendChild(hiddenInput);

            // the form will be submitted through the iframe
            // listen for it to successfully load – i.e. the user has been logged in
            document.getElementById("oidc_frame_em").addEventListener("load", function (e) {
                // once the hidden auth frame loads, we know we've logged in
                // run after-login actions
                afterLogin();
            });

            // submit the form
            requestForm.submit();

        } else {
            // skip straight to after-login actions
            afterLogin();
        }

    } else {
        document.getElementById("auth0-gated-content").classList.remove("add");
        document.getElementById("sn-gated-content").classList.add("hidden");
    }

    updateUI();
}

const afterLogin = () => {
    // remove the hidden request form and iframe, and the please login message
    requestForm.remove();
    document.getElementById("oidc_frame_em").remove();
    document.getElementById("pleaseLogin").remove();
    
    // and show the main visible iframe and navigate it to the Service Portal home page
    document.getElementById("sn-gated-content").classList.remove("hidden");
    home();
};

const updateUI = async () => {
    // enable/disable the various buttons
    document.getElementById("btn-login").disabled = isAuthenticated;
    document.getElementById("btn-logout").disabled = !isAuthenticated;
    document.getElementById("btn-home").disabled = !isAuthenticated || page === 'home';
    document.getElementById("btn-catalogItem").disabled = !isAuthenticated || page === 'catalogItem';
    document.getElementById("btn-knowledgeArticle").disabled = !isAuthenticated || page === 'knowledgeArticle';

    if (isAuthenticated) {
        // show the "you are logged in as" message in the header, if logged in
        document.getElementById("auth0-gated-content").classList.remove("hidden");
        document.getElementById("ipt-userName").innerHTML = user.nickname;
    }
};

const login = async () => {
    // login using Auth0
    await auth0Client.loginWithRedirect({
        authorizationParams: {
            redirect_uri: window.location.origin
        }
    });
};

const logout = () => {
    // once the ServiceNow instance is hit with a logout.do, we can log out of Auth0
    document.getElementById("mainframe").addEventListener("load", function (e) {
        auth0Client.logout({
            logoutParams: {
                returnTo: window.location.origin
            }
        });
    });
    // change the main visibile frame to point at logout.do, logging out of the SN instance
    document.getElementById("mainframe").setAttribute("src", `${config.instance}/logout.do?sysparm_goto_url=sp`);
};

const home = () => {
    // change the main visibile frame to point at the Service Portal home page
    document.getElementById("mainframe").setAttribute("src", `${config.instance}/sp`);
    page = "home";
    updateUI();
};

const catalogItem = () => {
    // change the main visibile frame to point at a catalog item in Service Portal
    document.getElementById("mainframe").setAttribute("src", `${config.instance}/sp?id=sc_cat_item&sys_id=73b1bafa9752cd1021983d1e6253afb5&sysparm_category=d68eb4d637b1300054b6a3549dbe5db2`);
    page = "catalogItem";
    updateUI();
};

const knowledgeArticle = () => {
    // change the main visibile frame to point at a knowledge base article in Service Portal
    document.getElementById("mainframe").setAttribute("src", `${config.instance}/sp?id=kb_article&sys_id=207de43187032100deddb882a2e3ec7a`);
    page = "knowledgeArticle";
    updateUI();
};