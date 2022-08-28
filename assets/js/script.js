function setCookie(name, value, days, global) {
	let cookie = name + "=" + (value || "") + ';path=/;';
	if (days) {
		const date = new Date();
		date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
		cookie += "expires=" + date.toUTCString() + ";";
	}
	if (global) cookie += "domain=.tomatenkuchen.eu;";

	document.cookie = cookie;
}
function getCookie(name) {
	const cookies = document.cookie.split(";");

	for (let i = 0; i < cookies.length; i++) {
		let cookie = cookies[i].trim();

		if (cookie.split("=")[0] == name) return cookie.substring(name.length + 1, cookie.length);
	}
	return undefined;
}
function deleteCookie(name) {
	document.cookie = name + '=;Max-Age=-99999999;path=/;';
	document.cookie = name + '=;Max-Age=-99999999;path=/;domain=.tomatenkuchen.eu;';
}

function fadeOut(element) {
	if (!element) return;
	if (!element.style.opacity) element.style.opacity = 1;

	element.style.opacity = parseFloat(element.style.opacity) - 0.05;
	if (element.style.opacity >= 0) setTimeout(() => fadeOut(element), 25);
	else element.remove();
}
function fadeIn(element) {
	if (!element) return;
	if (!element.style.opacity) element.style.opacity = 0;

	element.style.opacity = parseFloat(element.style.opacity) + 0.05;
	if (element.style.opacity < 1) setTimeout(() => fadeIn(element), 25);
}

var reloadText;
function pageLoad() {
	if (!getCookie('cookie-dismiss')) {
		document.body.innerHTML += '' +
			'<div class="cookie-container" id="cookie-container" style="opacity: 0;">' +
			'<h2 style="color: var(--primary-text-color);">Information</h2>' +
			'<p>Unsere Website nutzt Cookies, um <br>bestmögliche Funktionalität bieten zu können.</p>' +
			'<button onclick="setCookie(\'cookie-dismiss\', \'true\', 60, true);fadeOut(document.getElementById(\'cookie-container\'));">Verstanden</button>' +
			'</div>';
		setTimeout(() => fadeIn(document.getElementById('cookie-container')), 1000);
	};

	document.getElementById("theme-toggle").addEventListener("change", function() {
		if (document.body.classList.contains("light-theme")) {
			document.body.classList.replace("light-theme", "dark-theme");
			setCookie("theme", "dark", 60, true);
		} else {
			document.body.classList.replace("dark-theme", "light-theme");
			setCookie("theme", "light", 60, true);
		};
	});

	document.getElementById("lang-toggle").addEventListener("change", function() {
		if (document.documentElement.lang.includes("en")) reloadText("de");
		else reloadText("en");
	});
	if (reloadText) reloadText(getLanguage());
	if (getLanguage() != "de") document.getElementById("lang-toggle").checked = true;
};