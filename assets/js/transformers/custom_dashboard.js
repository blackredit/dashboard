let bots = []
function getCustomHTML(json) {
	if (json.status == "success") {
		bots = json.bots
		let text = "<h1>Your custom bots</h1>" +
			"<p>This list includes all custom bots you have access to or you're paying for.</p><br>" +
			"<button type='button' class='createForm' onclick='createDialog()'>Create a custom bot</button><br>" +
			"<br><div class='integration-container'>" +
			json.bots.map(bot =>
				"<div id='bot-" + encode(bot.id) + "' class='integration'>" +
				"<div>" +
				"<div class='flex'>" +
				"<img src='" + encode(bot.avatar) + "?size=64' class='bot-avatar' alt='Bot avatar of " + encode(bot.username) + "' loading='lazy'>" +
				"<h2>" + encode(bot.username) + "</h2>" +
				"</div>" +
				"<p>Credit cost per day: <b>" + bot.cost.toLocaleString() + "</b></p>" +
				"<p>Balance across all paying users (<b>" + bot.paying.length + "</b>): <b>" + bot.balance.toLocaleString() + "</b></p>" +
				(bot.payingInvited.length > 0 ? "<p>Users invited to pay for the bot: <b>" + bot.payingInvited.length + "</b></p>" : "") +
				"</div>" +
				"<div>" +
				(bot.hasAccess ?
					"<button type='button' class='createForm' onclick='editDialog(\"" + encode(bot.id) + "\")'><ion-icon name='build-outline'></ion-icon>Edit</button>" +
					"<button type='button' class='createForm red' onclick='deleteBot(\"" + encode(bot.id) + "\")'><ion-icon name='trash-outline'></ion-icon>Delete</button>" +
					"<br>" +
					"<button type='button' class='createForm green' id='startbutton-" + encode(bot.id) + "' onclick='startBot(\"" + encode(bot.id) + "\")'><ion-icon name='caret-up-outline'></ion-icon>Start/Restart</button>" +
					"<button type='button' class='createForm red' id='stopbutton-" + encode(bot.id) + "' onclick='stopBot(\"" + encode(bot.id) + "\")'" +
					(bot.online ? "" : " disabled title='Bot is offline already'") + "><ion-icon name='caret-down-outline'></ion-icon>Stop</button>"
				:
					"<button type='button' class='createForm red' onclick='removeYourself(\"" + encode(bot.id) + "\")'>Remove yourself as paying user</button>"
				) +
				"</div>" +
				"</div>"
			).join("") +
			"</div>"

		if (json.invited.length > 0) {
			text += "<br><br><h1>Bots you've been invited to to pay for</h1>" +
				"<div class='integration-container'>" +
				json.invited.map(bot =>
					"<div id='bot-" + encode(bot.id) + "' class='integration'>" +
					"<h2>" + encode(bot.username) + "</h2>" +
					"<img src='" + encode(bot.avatar) + "?size=64' class='bot-avatar' alt='Bot avatar of " + encode(bot.username) + "'>" +
					"<div>" +
					"<button type='button' class='createForm green' onclick='acceptInvite(\"" + encode(bot.id) + "\")'>Accept invite</button>" +
					"<button type='button' class='createForm red' onclick='declineInvite(\"" + encode(bot.id) + "\")'>Decline invite</button>" +
					"</div>" +
					"</div>"
				).join("") +
				"</div>"
		}

		return text
	} else {
		return (
			"<h1>An error occured while handling your request!</h1>" +
			"<h2>" + json.message + "</h2>")
	}
}

const userList = (user, canDelete = false, isEditing = false) => "<li><img src='" + user.avatar + "?size=32' width='32' height='32' alt='User avatar of " + encode(user.username) + "'>" +
	encode(user.username) + (canDelete ? "<ion-icon name='trash-outline' onclick='removePaying" + (isEditing ? "Edit" : "") + "(\"" + user.id + "\")'></ion-icon>" : "") + "</li>"
let socket
let errorToast
let step = 1
let info = {}
let tokenElem

const refresh = (force = false, save = false) => {
	socket.send({action: "GET_custom_info", botToken: tokenElem.value, force, save})
	if (step == 4) {
		document.getElementById("forward-button").setAttribute("disabled", "")
		setTimeout(() => {
			document.getElementById("forward-button").removeAttribute("disabled")
		}, 10000)
	}
	if (save) document.getElementById("create-dialog").classList.add("hidden")
}

const forward = () => {
	document.getElementById("step" + step).setAttribute("hidden", "")
	step++
	if (step == 4 && info.todo.length == 0) step++
	document.getElementById("step" + step).removeAttribute("hidden")

	if (step >= 4) {
		document.getElementById("forward-button").textContent = step == 4 ? "Refresh" : "Create bot"
		document.getElementById("forward-button").onclick = () => refresh(true, step == 5)
	} else {
		document.getElementById("forward-button").textContent = "Next"
		document.getElementById("forward-button").onclick = forward
	}
	document.getElementById("back-button").removeAttribute("hidden")
	document.getElementById("setup-progress").value = step
}
const back = () => {
	if (step <= 1) return
	document.getElementById("step" + step).setAttribute("hidden", "")
	step--
	if (step == 4 && info.todo.length == 0) step--
	document.getElementById("step" + step).removeAttribute("hidden")

	document.getElementById("forward-button").removeAttribute("hidden")
	document.getElementById("forward-button").textContent = "Next"
	document.getElementById("forward-button").onclick = forward
	if (step == 1) document.getElementById("back-button").setAttribute("hidden", "")
	document.getElementById("setup-progress").value = step
}

function connectWS() {
	socket = sockette("wss://api.tomatenkuchen.com/user", {
		onClose: () => {
			errorToast = new ToastNotification({type: "ERROR", title: "Lost connection, retrying...", timeout: 30}).show()
		},
		onOpen: event => {
			console.log("Connected!", event)
			if (errorToast) {
				errorToast.setType("SUCCESS")
				setTimeout(() => {
					errorToast.close()
				}, 1000)
			}
			socket.send({
				status: "success",
				action: "GET_custom",
				token: getCookie("token")
			})
		},
		onMessage: json => {
			if (json.action == "NOTIFY") new ToastNotification(json).show()
			else if (json.action == "SAVED_custom") {
				new ToastNotification({type: "SUCCESS", title: "Custom bot " + json.username + " saved!", timeout: 10}).show()
				socket.send({status: "success", action: "GET_custom"})
			} else if (json.action == "ADDED_custom_paying") {
				if (json.status == "failed") new ToastNotification({type: "ERROR", title: json.message || "Unknown user!"}).show()
				else document.getElementById("bot-paying").innerHTML = "<ul>" + json.paying.map(u => userList(u, true)).join("") + "</ul>" + (json.payingInvited.length > 0 ?
					"<br><p>Users that can accept the invite on this page after creation:<ul>" + json.payingInvited.map(u => userList(u, true)).join("") + "</ul>": "")
			} else if (json.action == "EDITED_custom_paying") {
				if (json.status == "failed") new ToastNotification({type: "ERROR", title: json.message || "Unknown user!"}).show()
				else document.getElementById("bot-edit-paying").innerHTML = "<ul>" + json.paying.map(u => userList(u, true)).join("") + "</ul>" + (json.payingInvited.length > 0 ?
					"<br><p>Users that can accept the invite on this page:<ul>" + json.payingInvited.map(u => userList(u, true)).join("") + "</ul>": "")
			} else if (json.action == "RECEIVE_REMOVE_paying_custom") {
				new ToastNotification({type: "SUCCESS", title: json.message, timeout: 15}).show()
				document.getElementById("bot-" + json.bot).remove()
			} else if (json.action == "RECEIVE_DELETE_custom") {
				new ToastNotification({type: json.status == "success" ? "SUCCESS" : "ERROR", title: json.message, timeout: 15}).show()
				if (json.status == "success") document.getElementById("bot-" + json.bot).remove()
			} else if (json.action == "RECEIVE_custom") {
				document.getElementById("root-container").innerHTML = getCustomHTML(json)
				document.getElementById("linksidebar").innerHTML =
					"<a href='/' title='Home' class='tab'>" +
						"<ion-icon name='home-outline'></ion-icon>" +
						"<p translation='sidebar.home'></p>" +
					"</a>" +
					"<a href='/commands' title='Bot commands' class='tab'>" +
						"<ion-icon name='terminal-outline'></ion-icon>" +
						"<p translation='sidebar.commands'></p>" +
					"</a>" +
					"<a href='/dashboard' class='tab'>" +
						"<ion-icon name='settings-outline'></ion-icon>" +
						"<p translation='sidebar.dashboard'></p>" +
					"</a>" +
					"<div class='section middle'><p class='title'>Your profile</p>" +
					"<a class='tab otherlinks active' href='./custom'><ion-icon name='diamond-outline'></ion-icon><p>Custom bots</p></a>" +
					"<a class='tab otherlinks' href='./dataexport'><ion-icon name='file-tray-stacked-outline'></ion-icon><p>Your user data</p></a>" +
					"</div>"

				reloadText()
			} else if (json.action == "RECEIVE_custom_info") {
				info = json
				if (json.status == "success") {
					tokenElem.setCustomValidity("")
					document.getElementById("bot-data").removeAttribute("hidden")
					if (step == 1) document.getElementById("forward-button").removeAttribute("disabled")

					document.getElementById("bot-name").textContent = encode(json.username)
					document.getElementById("bot-invite").href = "https://tomatenkuchen.com/invite?bot=" + json.id
					document.getElementById("bot-avatar").src = encode(json.avatar) + "?size=64"
					document.getElementById("bot-access").innerHTML = json.access.map(userList).join("")
					document.getElementById("bot-paying").innerHTML = "<ul>" + json.paying.map(u => userList(u, true)).join("") + "</ul>" + (json.payingInvited.length > 0 ?
						"<br><p>Users that can accept the invite on this page after creation:<ul>" + json.payingInvited.map(u => userList(u, true)).join("") + "</ul>": "")
					document.getElementById("bot-todo").innerHTML = json.todo.map(i => "<li>" + i + "</li>").join("") +
						(json.info.length > 0 ? "</ul><br><ul>" + json.info.map(i => "<li>" + i + "</li>").join("") : "")

					if (step == 4 && json.todo.length == 0) {
						forward()
						document.getElementById("forward-button").removeAttribute("disabled")
					}
				} else tokenElem.setCustomValidity(json.message)
				tokenElem.reportValidity()
			}
		}
	})
}

const createDialog = () => {
	step = 2
	back()
	openDialog(document.getElementById("create-dialog"))

	document.getElementById("custom-token").value = ""
	document.getElementById("custom-invite").value = ""
	document.getElementById("step3").setAttribute("hidden", "")
	document.getElementById("step4").setAttribute("hidden", "")
	document.getElementById("step5").setAttribute("hidden", "")
}

let editingBot = {}
const editDialog = (botId = "") => {
	openDialog(document.getElementById("edit-dialog"))
	editingBot = bots.find(b => b.id == botId)

	document.getElementById("bot-edit-paying").innerHTML = "<ul>" + editingBot.paying.map(u => userList(u, true, true)).join("") + "</ul>" + (editingBot.payingInvited.length > 0 ?
		"<br><p>Users that can accept the invite on this page:<ul>" + editingBot.payingInvited.map(u => userList(u, true, true)).join("") + "</ul>": "")

	if (editingBot.canStatus) {
		document.getElementById("upgrade-status").setAttribute("checked", "")
		document.getElementById("status-container").removeAttribute("hidden")
	} else {
		document.getElementById("upgrade-status").removeAttribute("checked")
		document.getElementById("status-container").setAttribute("hidden", "")
	}
	if (editingBot.canOtherBot) {
		document.getElementById("upgrade-respondotherbot").setAttribute("checked", "")
		document.getElementById("respondotherbot-container").removeAttribute("hidden")
	} else {
		document.getElementById("upgrade-respondotherbot").removeAttribute("checked")
		document.getElementById("respondotherbot-container").setAttribute("hidden", "")
	}
}
const addPayingEdit = () => {
	socket.send({action: "ADD_EDIT_custom_paying", bot: editingBot.id, user: document.getElementById("edit-paying").value})
	document.getElementById("edit-paying").value = ""
}
const removePayingEdit = user => socket.send({action: "REMOVE_EDIT_custom_paying", bot: editingBot.id, user})

const statusEmoji = {
	online: "🟢",
	idle: "🟡",
	dnd: "🔴",
	offline: "⚫"
}
const statusActivity = {
	custom: "Custom",
	playing: "Playing",
	streaming: "Streaming",
	listening: "Listening",
	watching: "Watching",
	competing: "Competing"
}
const addStatus = () => {
	if (!document.getElementById("status-text").value) return new ToastNotification({type: "ERROR", timeout: 10, title: "You must set a status text!"}).show()
	if (document.getElementById("status-activity").value == "streaming" && !document.getElementById("status-text").value.includes("twitch.tv/"))
		return new ToastNotification({
			type: "ERROR", timeout: 10, title: "You must include a twitch.tv/<user> url in the Status text when using the Streaming activity!",
			tag: "The first occurrence of it won't be shown in the status later."
		}).show()

	socket.send({
		action: "ADD_custom_status", bot: editingBot.id,
		text: document.getElementById("status-text").value, status: document.getElementById("status-status").value, activity: document.getElementById("status-activity").value
	})

	document.getElementById("status-list").innerHTML +=
		"<div><br>" +
		"<p>" + encode(statusEmoji[document.getElementById("status-status").value] + " " + statusActivity[document.getElementById("status-activity").value] +": " +
		document.getElementById("status-text").value) + "</p>" +
		"<ion-icon name='trash-outline' onclick='removeStatus(this)'></ion-icon>" +
		"</div>"
	document.getElementById("status-text").value = ""
}
const removeStatus = elem => {
	socket.send({action: "REMOVE_custom_status", bot: editingBot.id, text: elem.parentElement.querySelector("p").textContent})
	elem.parentElement.remove()
}

const addRespondBot = () => {
	if (!document.getElementById("respondotherbot-id").value || document.getElementById("respondotherbot-id").value.length < 17 || document.getElementById("respondotherbot-id").value.length > 21)
		return new ToastNotification({type: "ERROR", timeout: 10, title: "You must enter a valid bot ID!"}).show()

	socket.send({action: "ADD_custom_otherbot", bot: editingBot.id, text: document.getElementById("respondotherbot-id").value})

	document.getElementById("respondotherbot-list").innerHTML +=
		"<div><br>" +
		"<p>" + encode(document.getElementById("respondotherbot-id").value) + "</p>" +
		"<ion-icon name='trash-outline' onclick='removeRespondBot(this)'></ion-icon>" +
		"</div>"
	document.getElementById("respondotherbot-id").value = ""
}
const removeRespondBot = elem => {
	socket.send({action: "REMOVE_custom_otherbot", bot: editingBot.id, text: elem.parentElement.querySelector("p").textContent})
	elem.parentElement.remove()
}

const toggleStatus = () => {
	socket.send({action: "TOGGLE_custom_status", bot: editingBot.id, enabled: document.getElementById("upgrade-status").checked})
	document.getElementById("status-container").toggleAttribute("hidden")
}
const toggleOtherBots = () => {
	socket.send({action: "TOGGLE_custom_otherbot", bot: editingBot.id, enabled: document.getElementById("upgrade-respondotherbot").checked})
	document.getElementById("respondotherbot-container").toggleAttribute("hidden")
}

const addPaying = () => {
	socket.send({action: "ADD_custom_paying", botToken: tokenElem.value, user: document.getElementById("custom-invite").value})
	document.getElementById("custom-invite").value = ""
}
const removePaying = user => socket.send({action: "REMOVE_custom_paying", botToken: tokenElem.value, user})

const startBot = bot => {
	socket.send({action: "START_custom", bot})
	document.getElementById("startbutton-" + bot).setAttribute("disabled", "")
	document.getElementById("stopbutton-" + bot).setAttribute("disabled", "")

	setTimeout(() => {
		document.getElementById("startbutton-" + bot).removeAttribute("disabled")
		document.getElementById("stopbutton-" + bot).removeAttribute("disabled")
	}, 20000)
}
const stopBot = bot => {
	socket.send({action: "STOP_custom", bot})
	document.getElementById("startbutton-" + bot).setAttribute("disabled", "")
	document.getElementById("stopbutton-" + bot).setAttribute("disabled", "")

	setTimeout(() => {
		document.getElementById("startbutton-" + bot).removeAttribute("disabled")
	}, 20000)
}

const removeYourself = bot => {
	const confirmed = confirm("Are you sure you want to remove yourself from the paying users of the bot " + encode(bot) + "?")
	if (confirmed) socket.send({action: "REMOVE_custom_paying_yourself", bot})
}
const deleteBot = bot => {
	const confirmed = confirm("Are you sure you permanently want to delete the bot " + encode(bot) + "? There's no going back and ALL data will be lost immediately!")
	if (confirmed) socket.send({action: "DELETE_custom", bot})
}
const acceptInvite = bot => {
	socket.send({action: "ACCEPT_invite", bot})
	setTimeout(connectWS, 2000)
}
const declineInvite = bot => {
	socket.send({action: "DECLINE_invite", bot})
	document.getElementById("bot-" + bot).remove()
}

function tokenChange() {
	step = 1
	document.getElementById("bot-data").setAttribute("hidden", "")
	document.getElementById("back-button").setAttribute("hidden", "")
	document.getElementById("forward-button").setAttribute("disabled", "")

	const value = tokenElem.value
	if (value.length >= 50 && value.length <= 90 && /^[-a-z0-9_]{20,}\.[-a-z0-9_]{5,}\.[-a-z0-9_]{25,}$/i.test(value)) refresh()
}

loadFunc = () => {
	tokenElem = document.getElementById("custom-token")

	if (getCookie("token")) connectWS()
	else {
		document.getElementById("root-container").innerHTML = "<h1>Redirecting to login...</h1>"
		location.href = "/login?next=" + encodeURIComponent(location.pathname + location.search)
	}
}
