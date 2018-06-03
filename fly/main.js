function getParameterByName(name) {
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(window.location.href);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

Math.map = function(no, min, max, nmin, nmax) {
    var pc = (no - min) / (max - min);
    return nmin + ((nmax - nmin) * pc);
}

Number.prototype.mod = function(n) {
	return ((this%n)+n)%n;
};

Math.degrees = function(angle) {
    return angle * (180 / Math.PI);
}

function hexToRgb(hex) {
    var r = (hex >> 16) & 255;
    var g = (hex >> 8) & 255;
    var b = hex & 255;

    return new THREE.Vector3(r, g, b);
}

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 900);

var renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

var mapParent = document.getElementById('miniMap');
var mapSize = mapParent.getBoundingClientRect();

var mapCamera = new THREE.OrthographicCamera(mapSize.width / - 0.5, mapSize.width / 0.5, mapSize.height / 0.5, mapSize.height / - 0.5, 1, 1500);
var mapRenderer = new THREE.WebGLRenderer();
mapRenderer.setSize(mapSize.width, mapSize.height);
mapParent.appendChild(mapRenderer.domElement);
mapCamera.rotation.set(-Math.PI / 2, 0, 0)

var waterColor = 0x5DADE2;

var waterPlaneGeom = new THREE.PlaneGeometry(2000, 2000, 1, 1);
var waterPlaneMaterial = new THREE.MeshBasicMaterial( {color: waterColor, side: THREE.FrontSide, transparent: true, opacity: 0.55} );
var waterPlane = new THREE.Mesh(waterPlaneGeom, waterPlaneMaterial);
scene.add(waterPlane);
waterPlane.rotation.x = Math.PI / 2;

var worldRange = parseInt(getParameterByName('r'));
var seed = getParameterByName('s');

var gen = null;
switch (parseInt(getParameterByName('a'))) {
    case 0:
        gen = new DiamondGenerator();
        break;
    case 1:
        gen = new PerlinNoiseGenerator(0.1, seed);
        break;
    case 2:
        gen = new SimplexNoiseGenerator(0.1, seed);
        break;
}

var waterHeight = parseInt(getParameterByName('w'));
camera.position.y = waterHeight + worldRange + 40;
camera.rotation.x = -0.29;

var chunkLoader = new ChunkLoader(4, 33, 33, worldRange, 330, 330, gen, waterHeight, hexToRgb(waterColor));

var keyInput = new KeyInput();

var stats = models[parseInt(getParameterByName('p'))].stats;
var cameraLocalRotation = new THREE.Vector2(-0.29, 0);
var velocity = 0;
function updateControls() {
    var velocityInc = 0;
    if (keyInput.isKeyPressed(16)) { //Shift
        velocityInc += 0.01;
    }
    if (keyInput.isKeyPressed(17)) { //Ctrl
        velocityInc -= 0.01;
    }
    velocity = Math.min(1, Math.max(0, velocity + velocityInc));
    camera.translateZ(-velocity * stats.speed * 0.001);
    
    document.getElementById('throttle').style.height = (velocity * (window.innerHeight / 3.5)) + 'px';
    document.getElementById('throttlepc').innerHTML = Math.round(velocity * 100) + '%';

    var rotateInc = new THREE.Vector2();
    if (autopilot) updateAutoPilot(rotateInc);
    else {
        if (keyInput.isKeyPressed('w')) {
            rotateInc.x -= 0.03;
        }
        if (keyInput.isKeyPressed('s')) {
            rotateInc.x += 0.03;
        }
        if (keyInput.isKeyPressed('a')) {
            rotateInc.y += 0.03;
        }
        if (keyInput.isKeyPressed('d')) {
            rotateInc.y -= 0.03;
        }
    }
    
    rotateInc.x *= stats.handling * velocity;
    rotateInc.y *= stats.handling * velocity;
    camera.rotateX(rotateInc.x);
    camera.rotateZ(rotateInc.y);
}

var commandInput = document.getElementById('command');
var selected = 0;
var autopilot = false;
var commandParser = new CommandParser([
    new Command('echo', /.*/, function(parts) {
        return parts.join(' ');
    }),
    new Command('goto', /[0-9\.]+ [0-9\.]+|[0-9\.]+ [0-9\.]+ [\.0-9]*/, function(parts) {
        var x = parseFloat(parts[0]);
        var y = parseFloat(parts[1]);
        var z = parts[2]? parseFloat(parts[2]):null;
        if (z) {
            camera.position.set(x, y - waterHeight, z);  
            return 'Moved to ' + x + ', ' + y + ', ' + z;
        } else {
            camera.position.set(x, waterHeight, y);
            return 'Moved to ' + x + ', ' + waterHeight + ', ' + y;
        }
    }),
    new Command('reset', /.*/, function(parts) {
        window.location.reload();
    }),
    new Command('set', /[a-z]+ [0-9]+/, function(parts) {
        switch (parts[0]) {
            case 'plane':
                stats = models[parseInt(parts[1])].stats;
                return;
            case 'water':
                waterHeight = parseInt(parts[1]);
                return;
            default:
                return 'ERROR: Attribute not found';
        }
    }),
    new Command('toggle', /[a-z]+/, function(parts) {
        var map = document.getElementById('miniMap').style,
            centerdot = document.getElementById('centerdot').style,
            coords = document.getElementById('coords').style,
            throttle = document.getElementById('throttle').style;
        
        switch (parts[0]) {
            case 'map':
                map.opacity = map.opacity == '0'? '1':'0';
                centerdot.opacity = centerdot.opacity == '0'? '1':'0';
                return;
            case 'position':
                coords.opacity = coords.opacity == '0'? '1':'0';
                return;
            case 'throttle':
                throttle.opacity = throttle.opacity == '0'? '1':'0';
                return;
            case 'all':
                map.opacity = map.opacity == '0'? '1':'0';
                centerdot.opacity = centerdot.opacity == '0'? '1':'0';
                coords.opacity = coords.opacity == '0'? '1':'0';
                throttle.opacity = throttle.opacity == '0'? '1':'0';
                return;
            default:
                return 'ERROR: Attribute not found';
        }
    }),
    new Command('rotation', /.*/, function(parts) {
        return Math.degrees(camera.rotation.x) + ', ' + Math.degrees(camera.rotation.y) + ', ' + Math.degrees(camera.rotation.z);
    }),
    new Command('rotate', /[0-9]+ [0-9]+ [0-9]+/, function(parts) {
        camera.rotation.set(parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2]));
    }),
    new Command('clear', /.*/, function(parts) {
        document.getElementById('pastCommands').innerHTML = '';
    }),
    new Command('autopilot', /$|[0-9]+ [0-9]+ [0-9]+/, function(parts) {
        if (autopilot) {
            autopilot = false;
            return 'Auto pilot disengaged';
        }
        
        if (parts[0]) {
            camera.rotation.set(parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2]));
        } else {
            camera.rotation.set(0, 0, 0);
        }
        autopilot = true;
        return 'Auto pilot engaged';
    }),
    new Command('height', /$|true|false/, function(parts) {
        if (parts[0] == 'true') return getBelow(camera.position.x, camera.position.z);
        return camera.position.y - waterHeight;
    })
]);

function updateAutoPilot(rotateInc) {
    var below = getBelow(camera.position.x, camera.position.z);
    var dist = camera.position.y - below;
    
    if (dist < 50 + worldRange) rotateInc.x += Math.min(0.0005 * Math.abs(dist), 0.005);
    else if (dist > 100 + worldRange) rotateInc.x -= Math.min(0.0005 * dist, 0.005);
}

var commandMenu = false;
function showCommandMenu() {
    commandMenu = true;
    document.getElementById('commandView').setAttribute('style', 'opacity: 0.5');
    commandInput.value = '/';
    commandInput.focus();
}

function hideCommandMenu() {
    commandMenu = false;
    document.getElementById('commandView').setAttribute('style', 'opacity: 0');
    document.activeElement.blur();
}

function setSelected(selected, past) {
    var item = past[selected];
    commandInput.value = item? item.innerText:'/';
    window.event.preventDefault();
}

commandInput.addEventListener('keyup', function(event) {
    var pastCommandsDiv = document.getElementById('pastCommands');
    var past = document.getElementById('pastCommands').getElementsByClassName('command');
    if (event.keyCode == 13) {
        var string = null;
        if (commandInput.value[0] == '/') string = commandParser.parse(commandInput.value);
        else string = eval(commandInput.value);

        string = '<span class="command">' + commandInput.value + '</span><br />' + (string != null? '- ' + string + '<br />':'');
        if (commandInput.value != '/clear') pastCommandsDiv.innerHTML += string;

        commandInput.value = '/';
        pastCommandsDiv.scrollTop = pastCommandsDiv.getBoundingClientRect().height;
        selected = past.length;
    } else if (event.keyCode == 38) {
        setSelected(--selected, past);
    } else if (event.keyCode == 40) {
        setSelected(++selected, past);
    }
});

function getBelow(x, y) {
    var playerChunkX = Math.ceil(x / chunkLoader.graphicalWidth);
    var playerChunkZ = Math.ceil(y / chunkLoader.graphicalHeight);

    var chunk = chunkLoader.findChunkAt(playerChunkX, playerChunkZ);

    var innerChunkX = parseInt(((x % chunkLoader.graphicalWidth) / chunkLoader.graphicalWidth) * chunkLoader.chunkWidth);
    var innerChunkZ = parseInt(((y % chunkLoader.graphicalHeight) / chunkLoader.graphicalHeight) * chunkLoader.chunkHeight);

    if (innerChunkX < 0) innerChunkX = chunkLoader.chunkWidth - Math.abs(innerChunkX);
    if (innerChunkZ < 0) innerChunkZ = chunkLoader.chunkHeight - Math.abs(innerChunkZ);

    var height = chunk.grid.get(innerChunkX, innerChunkZ) - waterHeight;
    return Math.max(height, 0);
}

var direction = new THREE.Vector3();
var update = function() {
    if (keyInput.isKeyPressed(191) && !commandMenu) {
        showCommandMenu();
    } else if (keyInput.isKeyPressed(27) && commandMenu) {
        hideCommandMenu();
    }
    if (!commandMenu) {
        updateControls();    
    }

    waterPlane.position.set(camera.position.x, waterHeight, camera.position.z);
    mapCamera.position.set(camera.position.x, 1300, camera.position.z);
    document.getElementById('xCoord').innerText = Math.round(camera.position.x);
    document.getElementById('yCoord').innerText = Math.round(camera.position.z);


    camera.getWorldDirection(direction);
    document.getElementById('centerdot').style.transform = 'rotate(' + -Math.atan2(direction.x, direction.z) + 'rad)';

    var toAdd = chunkLoader.update(camera.position.x, camera.position.z);
    toAdd.forEach(function(item) {
        scene.add(item);
    });

    renderer.render(scene, camera);
    mapRenderer.render(scene, mapCamera);
    requestAnimationFrame(update);
};

scene.background = new THREE.Color(0xBEEBFF);

update();