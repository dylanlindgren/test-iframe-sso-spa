const fetchConfig = () => fetch("/config.json");

let page = null;
let auth0Client = null;
let isAuthenticated = null;
let config = null;

window.onload = async () => {

    const response = await fetchConfig();
    config = await response.json();

    auth0Client = await auth0.createAuth0Client({
        domain: config.domain,
        clientId: config.clientId
    });

    isAuthenticated = await auth0Client.isAuthenticated();

    if (isAuthenticated) {

        document.getElementById("auth0-gated-content").classList.remove("hidden");

        let accessToken = await auth0Client.getTokenSilently({
            authorizationParams: {
                audience: config.instanceClientId,
            }
        });

        let requestForm = document.getElementById("requestForm");
        requestForm.action = `${config.instance}/navpage.do?redirect_uri=/welcome.do&failure_uri=/welcome.do`;
        console.log(requestForm);
        var hiddenInput = document.createElement("input");
        hiddenInput.type = "hidden";
        hiddenInput.name = "X_USER_TOKEN";
        hiddenInput.value = accessToken;
        document.getElementById("requestForm").appendChild(hiddenInput);
        document.getElementById("requestForm").submit();
        document.getElementById("oidc_frame_em").addEventListener("load", function (e) {
            console.log("Loaded OIDC frame");
            document.getElementById("requestForm").remove();
            document.getElementById("oidc_frame_em").remove();
            document.getElementById("pleaseLogin").remove();
            document.getElementById("sn-gated-content").classList.remove("hidden");
            home();
        });



    } else {
        document.getElementById("auth0-gated-content").classList.remove("add");
        document.getElementById("sn-gated-content").classList.add("hidden");
    }

    updateUI();

    const query = window.location.search;

    if (query.includes("code=") && query.includes("state=")) {
        await auth0Client.handleRedirectCallback();
        home();
        updateUI();
        window.history.replaceState({}, document.title, "/");
    }
}

const updateUI = () => {
    document.getElementById("btn-login").disabled = isAuthenticated;
    document.getElementById("btn-logout").disabled = !isAuthenticated;
    document.getElementById("btn-home").disabled = !isAuthenticated || page === 'home';
    document.getElementById("btn-catalogItem").disabled = !isAuthenticated || page === 'catalogItem';
    document.getElementById("btn-knowledgeArticle").disabled = !isAuthenticated || page === 'knowledgeArticle';
};

const login = async () => {
    await auth0Client.loginWithRedirect({
        authorizationParams: {
            redirect_uri: window.location.origin
        }
    });
};

const logout = () => {
    auth0Client.logout({
        logoutParams: {
            returnTo: window.location.origin
        }
    });
};

const home = () => {
    document.getElementById("mainframe").setAttribute("src", `${config.instance}/sp`);
    page = "home";
    updateUI();
};

const catalogItem = () => {
    document.getElementById("mainframe").setAttribute("src", `${config.instance}/sp?id=sc_cat_item&sys_id=73b1bafa9752cd1021983d1e6253afb5&sysparm_category=d68eb4d637b1300054b6a3549dbe5db2`);
    page = "catalogItem";
    updateUI();
};

const knowledgeArticle = () => {
    document.getElementById("mainframe").setAttribute("src", `${config.instance}/sp?id=kb_article&sys_id=207de43187032100deddb882a2e3ec7a`);
    page = "knowledgeArticle";
    updateUI();
};