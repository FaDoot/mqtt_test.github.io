document.addEventListener('DOMContentLoaded', (event) => {
    const launchButton = document.getElementById('launch');
    const terminateButton = document.getElementById('terminate');
    const messagesList = document.getElementById('messages');
    const brokerUrl = "wss://broker.hivemq.com:8884/mqtt"; // Public MQTT broker's Secure WebSocket URL
    const topic = "ros/launch_command"; // Define the MQTT topic
    const clientId = "MQTT_Subscriber_Node"; // Optional: Provide a unique client ID

    console.log("Using broker URL: " + brokerUrl);

    const client = new Paho.MQTT.Client(brokerUrl, clientId);

    client.onConnectionLost = function (responseObject) {
        if (responseObject.errorCode !== 0) {
            console.log("onConnectionLost:" + responseObject.errorMessage);
            setTimeout(reconnect, 2000);
        }
    };

    client.onMessageArrived = function (message) {
        console.log("onMessageArrived:" + message.payloadString);
        const listItem = document.createElement('li');
        listItem.textContent = message.payloadString;
        messagesList.appendChild(listItem);
    };

    client.connect({
        onSuccess: onConnect,
        onFailure: onFailure,
        useSSL: true // Use SSL/TLS
    });

    function onConnect() {
        console.log("Connected to MQTT broker");
        client.subscribe(topic);
    }

    function onFailure(responseObject) {
        console.log("Connection failed: " + responseObject.errorMessage);
    }

    function reconnect() {
        console.log("Attempting to reconnect...");
        client.connect({
            onSuccess: onConnect,
            onFailure: onFailure,
            useSSL: true // Use SSL/TLS
        });
    }

    launchButton.addEventListener('click', () => {
        const nRobots = document.getElementById('n_robots').value;
        const beUrl = document.getElementById('be_url').value;
        const message = JSON.stringify({ launch: true, n_robots: parseInt(nRobots), be_url: beUrl });
        if (nRobots === "" || beUrl === "") {
            // alert(`Enter Robot and Backend URL params`);
        } else {
            const mqttMessage = new Paho.MQTT.Message(message);
            mqttMessage.destinationName = topic;
            client.send(mqttMessage);
            console.log("Published: " + message);
            // alert(`Launch button clicked!\nParameters sent:\nNumber of Robots: ${nRobots}\nBackend URL: ${beUrl}`);
        }
    });

    terminateButton.addEventListener('click', () => {
        const message = JSON.stringify({ launch: false, n_robots: 0, be_url: "" });

        const mqttMessage = new Paho.MQTT.Message(message);
        mqttMessage.destinationName = topic;
        client.send(mqttMessage);
        console.log("Published: " + message);

        alert("Terminate button clicked!\nTerminating simulation.");
    });
});
