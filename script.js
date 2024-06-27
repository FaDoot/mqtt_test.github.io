document.addEventListener('DOMContentLoaded', (event) => {
    const launchButton = document.getElementById('launch');
    const terminateButton = document.getElementById('terminate');
    const showRasmusButton = document.getElementById('showrasmus');
    const resetButton = document.getElementById('reset_button');
    const messagesList = document.getElementById('messages');
    const brokerUrl = "wss://broker.hivemq.com:8884/mqtt";  // broker URL
    const launch_topic = "ros/launch_command"; // MQTT topic for sending launch and termination commands
    const mapTopic = "ros/map_names"; // MQTT topic for map names
    const clientId = "MQTT_Subscriber_Node"; // Client ID
    document.getElementById('save_button').style.display = 'none';
    document.getElementById('reset_button').style.display = 'none';

    let robotSizes = '';
    let robotPoses = '';
    let is_saved = false;

    // Initialize the MQTT client
    const client = new Paho.MQTT.Client(brokerUrl, clientId);

    // Handle connection loss
    client.onConnectionLost = function (responseObject) {
        if (responseObject.errorCode !== 0) {
            console.log("onConnectionLost:" + responseObject.errorMessage);
            setTimeout(reconnect, 2000);
        }
    };

    // Handle incoming messages
    client.onMessageArrived = function (message) {
        console.log("onMessageArrived:" + message.payloadString);
        const listItem = document.createElement('li');
        listItem.textContent = message.payloadString;
        messagesList.appendChild(listItem);

        // Populate map dropdown if the message is for map names
        if (message.destinationName === mapTopic) {
            populateDropdown(message.payloadString);
            saveMapsToLocalStorage(message.payloadString);
        }
    };

    // Connect to the MQTT broker
    client.connect({
        onSuccess: onConnect,
        onFailure: onFailure,
        useSSL: true // Use SSL/TLS
    });

    // Subscribe to relevant topics on successful connection
    function onConnect() {
        console.log("Connected to MQTT broker");
        client.subscribe(launch_topic);
        client.subscribe(mapTopic);
        loadMapsFromLocalStorage(); // Load maps from local storage
    }

    // Handle connection failure
    function onFailure(responseObject) {
        console.log("Connection failed: " + responseObject.errorMessage);
    }

    // Reconnect to the MQTT broker
    function reconnect() {
        console.log("Attempting to reconnect...");
        client.connect({
            onSuccess: onConnect,
            onFailure: onFailure,
            useSSL: true // Use SSL/TLS
        });
    }

    // Populate the map dropdown
    function populateDropdown(mapNames) {
        const stageWorldDropdown = document.getElementById('stage_world');
        stageWorldDropdown.innerHTML = ''; // Clear existing options

        // Split the message and create dropdown options
        const maps = mapNames.split(',');
        maps.forEach(map => {
            const option = document.createElement('option');
            option.value = map.trim();
            option.textContent = map.trim();
            stageWorldDropdown.appendChild(option);
        });

        // Set the saved stage world if it exists
        const savedMap = localStorage.getItem('stage_world');
        if (savedMap) {
            stageWorldDropdown.value = savedMap;
        }
    }

    // Save map names to local storage
    function saveMapsToLocalStorage(mapNames) {
        localStorage.setItem('mapNames', mapNames);
    }

    // Load map names from local storage
    function loadMapsFromLocalStorage() {
        const mapNames = localStorage.getItem('mapNames');
        if (mapNames) {
            populateDropdown(mapNames);
        }
    }

    // Load data from local storage
    function loadFromLocalStorage() {
        const nRobots = localStorage.getItem('n_robots') || '';
        document.getElementById('n_robots').value = nRobots;
        document.getElementById('be_url').value = localStorage.getItem('be_url') || '';
        loadMapsFromLocalStorage(); // Populate map dropdown

        if (nRobots) {
            const robotSizesContainer = document.getElementById('robotSizesContainer');
            robotSizesContainer.innerHTML = '';
            const saveButton = document.getElementById('save_button');
            const resetButton = document.getElementById('reset_button');

            saveButton.style.display = 'block';
            resetButton.style.display = 'block';

            for (let i = 1; i <= nRobots; i++) {
                addRobotSizeInputs(robotSizesContainer, i);
            }
        }
    }

    // Add input fields for robot sizes and poses
    function addRobotSizeInputs(container, index) {
        const robotSizeDiv = document.createElement('div');
        robotSizeDiv.className = 'robot-size';

        const lwhLabel = document.createElement('label');
        lwhLabel.textContent = `Robot ${index} Size (L W H):`;
        robotSizeDiv.appendChild(lwhLabel);

        const lengthInput = createInputElement(`robot_${index}_length`, 'Length');
        const widthInput = createInputElement(`robot_${index}_width`, 'Width');
        const heightInput = createInputElement(`robot_${index}_height`, 'Height');
        robotSizeDiv.appendChild(lengthInput);
        robotSizeDiv.appendChild(widthInput);
        robotSizeDiv.appendChild(heightInput);

        const poseLabel = document.createElement('label');
        poseLabel.textContent = `Robot ${index} Pose (X Y Z angle):`;
        robotSizeDiv.appendChild(poseLabel);

        const xInput = createInputElement(`robot_${index}_x`, 'X');
        const yInput = createInputElement(`robot_${index}_y`, 'Y');
        const zInput = createInputElement(`robot_${index}_z`, 'Z');
        const angleInput = createInputElement(`robot_${index}_angle`, 'Angle');
        robotSizeDiv.appendChild(xInput);
        robotSizeDiv.appendChild(yInput);
        robotSizeDiv.appendChild(zInput);
        robotSizeDiv.appendChild(angleInput);

        container.appendChild(robotSizeDiv);

        const separator = document.createElement('hr');
        separator.style.marginTop = '20px';
        separator.style.marginBottom = '20px';
        container.appendChild(separator);
    }

    // Helper function to create input elements and set their values from local storage
    function createInputElement(name, placeholder) {
        const input = document.createElement('input');
        input.type = 'text';
        input.name = name;
        input.placeholder = placeholder;
        input.value = localStorage.getItem(name) || '';
        return input;
    }

    // Event listener for changing the number of robots
    document.getElementById('n_robots').addEventListener('input', function () {
        const numRobots = parseInt(this.value, 10);
        const robotSizesContainer = document.getElementById('robotSizesContainer');

        const saveButton = document.getElementById('save_button');
        const resetButton = document.getElementById('reset_button');

        robotSizesContainer.innerHTML = '';

        if (numRobots > 0) {
            saveButton.style.display = 'block';
            resetButton.style.display = 'block';

            for (let i = 1; i <= numRobots; i++) {
                addRobotSizeInputs(robotSizesContainer, i);
            }

            // Save the number of robots to local storage
            localStorage.setItem('n_robots', numRobots);
        } else {
            saveButton.style.display = 'none';
            resetButton.style.display = 'none';
            localStorage.removeItem('n_robots');
        }
    });

    // Event listener for saving the form
    document.getElementById('save_button').addEventListener('click', function (event) {
        event.preventDefault(); // Prevent the default form submission

        robotSizes = '';
        robotPoses = '';

        const children = document.getElementById('robotSizesContainer').children;
        console.log("children Length: " + children.length);
        // If no values are provided, set default values
        for (let i = 0; i < children.length; i++) {
            const inputs = children[i].querySelectorAll('input');
            if (inputs.length === 7) {
                const lengthValue = inputs[0].value || '1.0';
                const widthValue = inputs[1].value || '0.6';
                const heightValue = inputs[2].value || '0.35';
                const xValue = inputs[3].value || '0.000';
                const yValue = inputs[4].value || '0.000';
                const zValue = inputs[5].value || '0.000';
                const angleValue = inputs[6].value || '-90.000';

                robotSizes += lengthValue + ' ' + widthValue + ' ' + heightValue + ' ';
                robotPoses += xValue + ' ' + yValue + ' ' + zValue + ' ' + angleValue + ' ';

                // Save individual values to local storage
                localStorage.setItem(`robot_${Math.floor(i / 2) + 1}_length`, lengthValue);
                localStorage.setItem(`robot_${Math.floor(i / 2) + 1}_width`, widthValue);
                localStorage.setItem(`robot_${Math.floor(i / 2) + 1}_height`, heightValue);
                localStorage.setItem(`robot_${Math.floor(i / 2) + 1}_x`, xValue);
                localStorage.setItem(`robot_${Math.floor(i / 2) + 1}_y`, yValue);
                localStorage.setItem(`robot_${Math.floor(i / 2) + 1}_z`, zValue);
                localStorage.setItem(`robot_${Math.floor(i / 2) + 1}_angle`, angleValue);
            }
        }

        // Trim the trailing spaces
        robotSizes = robotSizes.trim();
        robotPoses = robotPoses.trim();

        console.log('Robot Sizes:', robotSizes);
        console.log('Robot Poses:', robotPoses);
        is_saved = true;

        // Save overall values to local storage
        localStorage.setItem('robotSizes', robotSizes);
        localStorage.setItem('robotPoses', robotPoses);
        localStorage.setItem('is_saved', true);
    });

    // Save the backend URL to local storage
    document.getElementById('be_url').addEventListener('input', function () {
        localStorage.setItem('be_url', this.value);
    });

    // Save the selected map to local storage
    document.getElementById('stage_world').addEventListener('change', function () {
        localStorage.setItem('stage_world', this.value);
    });

    // Event listener for launching the simulation
    launchButton.addEventListener('click', () => {
        if (!is_saved) {
            alert('Please save the configuration before launching.');
            return;
        }
        const nRobots = document.getElementById('n_robots').value;
        const beUrl = document.getElementById('be_url').value;
        const stage_world = document.getElementById('stage_world').value;

        const message = JSON.stringify({ launch: true, n_robots: parseInt(nRobots), be_url: beUrl, map: stage_world, sizes: robotSizes, poses: robotPoses });
        if (nRobots === "" || beUrl === "" || stage_world === "") {
            alert(`Enter Robot, Backend URL, and Floor Plan params`);
        } else {
            const mqttMessage = new Paho.MQTT.Message(message);
            mqttMessage.destinationName = launch_topic;
            client.send(mqttMessage);
            console.log("Published: " + message);
            alert(`Launch button clicked!\nParameters sent:\nNumber of Robots: ${nRobots}\nBackend URL: ${beUrl}\nMAP: ${stage_world}`);
        }
    });

    // Event listener for terminating the simulation
    terminateButton.addEventListener('click', () => {
        const message = JSON.stringify({ launch: false, n_robots: 0, be_url: "", stage_world: "" });
        const mqttMessage = new Paho.MQTT.Message(message);
        mqttMessage.destinationName = launch_topic;
        client.send(mqttMessage);
        console.log("Published: " + message);

        alert("Terminate button clicked!\nTerminating simulation.");
    });

    // Event listener for resetting the form
    resetButton.addEventListener('click', () => {

        const children = document.getElementById('robotSizesContainer').children;


        for (let i = 0; i < children.length; i++) {
            const inputs = children[i].querySelectorAll('input');
            inputs.forEach(input => {
                input.value = ''; // Clear the input value
                localStorage.setItem(input.name, ''); // Set corresponding local storage item to empty string
            });
        }

        // Clear robot sizes and poses
        document.getElementById('n_robots').value = '';
        localStorage.removeItem('n_robots');
        localStorage.removeItem('robotSizes');
        localStorage.removeItem('robotPoses');

        // Reset visibility of buttons
        document.getElementById('save_button').style.display = 'none';
        document.getElementById('reset_button').style.display = 'none';

        alert("Form reset and local storage cleared.");
    });

    // Call loadFromLocalStorage when the page loads
    loadFromLocalStorage();

    // Toggle visibility of Rasmus image
    showRasmusButton.addEventListener('click', () => {
        const image = document.getElementById('rasmusImg');
        if (image) {
            image.style.display = (image.style.display === 'none' || image.style.display === '') ? 'block' : 'none';
        }
    });
});
