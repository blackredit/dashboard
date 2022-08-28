// Modified from https://booky.dev/assets/js/language.js
var langCache = {};

const getLanguage = () => {
	if (getCookie("lang")) return getCookie("lang");

	const userLang = navigator.language || navigator.userLanguage;
	return userLang ? (userLang.split("-")[0] == "de" ? "de" : "en") : "en";
};

const resolveValue = (obj, key) => {
  	return resolveValue0(obj, key.split("."));
};

const resolveValue0 = (obj, keySplit) => {
  	if (keySplit.length == 1) return obj[keySplit[0]];
  	return resolveValue0(obj[keySplit[0]], keySplit.slice(1));
};

var reloadText = async language => {
	setCookie("lang", language, 60, true);
	document.documentElement.lang = language;

	const i18n = document.querySelectorAll("[translation]");
	if (i18n.length <= 0) return;

	const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;

	const json = await loadLangFile(language)
	for (let i = 0; i < i18n.length; i++) {
		const element = i18n.item(i);
		var key = element.getAttribute("translation");
		if (key == "global.login" && getCookie("user")) {
			element.innerHTML = getCookie("user");
			continue;
		};
		var text = resolveValue(json, key);

		if (element.hasAttribute("arguments")) {
			const arguments = JSON.parse(element.getAttribute("arguments"));
			Object.keys(arguments).forEach(replaceKey => text = text.replaceAll(replaceKey, arguments[replaceKey]));
		};

		if (typeof text != "string") return console.warn("Couldn't load lang string " + key + ", got " + typeof text + " instead", text);
		element.innerHTML = text;
	};

	document.documentElement.scrollTop = document.body.scrollTop = scrollTop;
};

const loadLangFile = async language => {
	if (langCache[language]) return langCache[language];

	const resgh = await fetch("https://raw.githubusercontent.com/DEVTomatoCake/TomatenKuchen-i18n/website/" + language + ".json").catch(() => {});
	if (resgh?.ok) {
		const json = await resgh.json();
		langCache[language] = json;
		setTimeout(() => {
			delete langCache[language];
		}, 30 * 60 * 1000);
		return json;
	};
	console.warn("Couldn't load lang file from github");

	const resbackup = await fetch("https://api.tomatenkuchen.eu/dashboard/" + language + ".json").catch(() => {});
	if (resbackup?.ok) {
		const json = await resbackup.json();
		return json;
	};
	console.error("Couldn't load lang file from backup url");
	alert("The lang file couldn't be loaded, the site might not work probably. Try again later!");
};