var log = require('npmlog')
var net = require('net');
var fs = require('fs');
const moment = require('moment');
let m = moment();
var request = require('request');
var mqtt=require('mqtt');

const mqttlogin = {url: process.env.mqtturl, username: process.env.mqttuser, password: process.env.mqttpass};

log.addLevel('debug',     1, {fg: 'white'}, "[DEBUG]     ");
log.addLevel('verbose',      3, { fg: 'green'  }, "[VERBOSE] ");
log.addLevel('info',    5, { fg: 'blue' }, "[INFO]   ");
log.addLevel('error',     7, { fg: 'red'    }, "[ERROR]  ");

log.level = process.env.loglevel;


var server = net.createServer(function(socket) {

	socket.setKeepAlive(true);

	log.verbose('[TCP]', 'New incoming connection', `${socket.remoteAddress}:${socket.remotePort}`);

	socket.on('data', function(data){
        var cdate = new Date().toISOString();
        log.debug('[DATA]', `${cdate} | Incoming data (hex): ` + data.toString('hex'));

        log.verbose('[DATA]', 'Received data length:' + data.length + "  ->   Parsing..."); 

		if(data.length==32) {

            var hex = data.toString('hex');
            var hexMsgType = hex.substring(4, 6);

            if(hexMsgType=='e7') {

                const newLocal = 'ffffa77000000000000000000000000000000000000000000000000000000000';
                socket.write(Buffer.from(newLocal, 'hex'));  //reply msg recieved OK

                var egateuid = hex.substring(20, 28);

                if (!global.egatesregistered.includes(egateuid)) {
                    log.info('[HADR]', `Adding eGate with UID ${egateuid} sensors to HomeAssistant Device Registery...`);

                    var mqttmsgtopic = `homeassistant/sensor/involar-${egateuid}/config`;
                    var mqttmsg = `{"name":"Involar eGate message sequence","availability":[{"topic":"homeassistant/sensor/involar-${egateuid}/availability"}],` +
                                  `"state_topic":"homeassistant/sensor/involar-${egateuid}-messagesequence/state", "unique_id": "involar-${egateuid}-messagesequence",` +
                                  `"device":{"identifiers":["${egateuid}"],"name":"Involar eGate ${egateuid}", "manufacturer":"Involar","model":"eGate"}}`;
                    client.publish(mqttmsgtopic, mqttmsg, {retain: true});
                    log.debug('[MQTT]', `SENT [${mqttmsgtopic}] ${mqttmsg}`);

                    global.egatesregistered.push(egateuid);

                    var mqttmsgtopic = `homeassistant/sensor/involar-${egateuid}/availability`;
                    var mqttmsg = 'online';
                    client.publish(mqttmsgtopic, mqttmsg, {retain: true});
                    log.debug('[MQTT]', `SENT [${mqttmsgtopic}] ${mqttmsg}`);

                    var mqttmsgtopic = `homeassistant/sensor/involar-${egateuid}-power/config`;
                    var mqttmsg = `{"name":"Involar eGate power","availability":[{"topic":"homeassistant/sensor/involar-${egateuid}/availability"}],` +
                                  `"state_topic":"homeassistant/sensor/involar-${egateuid}-power/state", "unique_id": "involar-${egateuid}-power",` +
                                  `"state_class": "measurement", "device_class": "power", "unit_of_measurement": "W","device":{"identifiers":["${egateuid}"]}}`;
                    client.publish(mqttmsgtopic, mqttmsg, {retain: true});
                    log.debug('[MQTT]', `SENT [${mqttmsgtopic}] ${mqttmsg}`);

                    var mqttmsgtopic = `homeassistant/sensor/involar-${egateuid}-energy/config`;
                    var mqttmsg = `{"name":"Involar eGate energy","availability":[{"topic":"homeassistant/sensor/involar-${egateuid}/availability"}],` +
                                  `"state_topic":"homeassistant/sensor/involar-${egateuid}-energy/state", "unique_id": "involar-${egateuid}-energy",` +
                                  `"state_class": "total_increasing", "device_class": "energy", "unit_of_measurement": "Wh","device":{"identifiers":["${egateuid}"]}}`;
                    client.publish(mqttmsgtopic, mqttmsg, {retain: true});
                    log.debug('[MQTT]', `SENT [${mqttmsgtopic}] ${mqttmsg}`);

                }

                var hexseq = hex.substring(28, 32); 
                var intseq = parseInt(hexseq, 16);
                log.verbose('[DATA - e7]', `[${egateuid}] eGate Msg Sequence: ${intseq}     (${hexseq})`); 
                var mqttmsgtopic = `homeassistant/sensor/involar-${egateuid}-messagesequence/state`; var mqttmsg = intseq.toString();
                client.publish(mqttmsgtopic, mqttmsg);
                log.debug('[MQTT]', `SENT [${mqttmsgtopic}] ${mqttmsg}`);

                var hexw = hex.substring(48, 52); 
                var intw = parseInt(hexw, 16)/4;
                log.verbose('[DATA - e7]', `[${egateuid}] eGate measured power (W): ${intw}     (${hexw})`); 
                var mqttmsgtopic = `homeassistant/sensor/involar-${egateuid}-power/state`; var mqttmsg = intw.toString();
                client.publish(mqttmsgtopic, mqttmsg);
                log.debug('[MQTT]', `SENT [${mqttmsgtopic}] ${mqttmsg}`);

                var hexwh = hex.substring(52, 60);
                var intwh = parseInt(hexwh, 16);
                log.verbose('[DATA - e7]', `[${egateuid}] eGate measured energy (Wh): ${intwh}     (${hexwh})`); 
                var mqttmsgtopic = `homeassistant/sensor/involar-${egateuid}-energy/state`; var mqttmsg = intwh.toString();
                client.publish(mqttmsgtopic, mqttmsg);
                log.debug('[MQTT]', `SENT [${mqttmsgtopic}] ${mqttmsg}`);

            } else if (hexMsgType=='e1') {
                var egateuid = hex.substring(8, 16);
                log.info('[DATA - e1]', `[${egateuid}] eGate startup message recieved`);
            } else {
                log.error('[DATA - ??]', `EXCEPTION: Unknown message type ${hexMsgType} recieved.`);
            }
  		} else if (data.length==544) {
            var hex = data.toString('hex');

            var egateuid = hex.substring(0, 8);

            if (global.egatesregistered.includes(egateuid)) {

                var hexseq = hex.substring(28, 32); 
                var intseq = parseInt(hexseq, 16);

                //split long data into array with parts of 64
                hexparts = [];
                do {
                    hexparts.push(hex.substring(0, 64));
                } while( (hex = hex.substring(64, hex.length)) != "" );

                hexparts.forEach(function(hexpart) {
                    log.debug('[DATA]', `[${egateuid}] Processing line: ${hexpart}`); 

                    var hexPartMsgType = hexpart.substring(0, 8);
                    log.debug('[DATA]', `[${egateuid}] Line Message type: ${hexPartMsgType}`); 
                    
                    if (hexPartMsgType == "ffff1a07") {
                        // data not known. Maybe includes microinverter serial?
                        var microinverterid = hexpart.substring(28, 32);
                        log.debug('[DATA]', `[${egateuid}-${microinverterid}] Recieved info type message. Discarding.`); 
                    } else if (hexPartMsgType == "ffff1a0e") {
                        // acutal data
                        var microinverterid = hexpart.substring(60, 64);

                        var microinvertername = egateuid + "-" + microinverterid;
                        if (!global.minvsregistered.includes(microinvertername)) { //check if MicroInverter is registered
                            // else add to homeassistant

                            log.info('[HADR]', `Adding microinverter with ID ${microinverterid} to HASS device eGate ${egateuid}...`);

                            var mqttmsgtopic = `homeassistant/sensor/involar-${microinvertername}-energy/config`;
                            var mqttmsg = `{"name":"Involar MicroInverter ${microinverterid} energy","availability":[{"topic":"homeassistant/sensor/involar-${egateuid}/availability"}],` +
                                          `"state_topic":"homeassistant/sensor/involar-${microinvertername}-energy/state", "unique_id": "involar-${microinvertername}-energy",` +
                                          `"state_class": "total_increasing", "device_class": "energy", "unit_of_measurement": "Wh","device":{"identifiers":["${egateuid}"]}}`;
                            client.publish(mqttmsgtopic, mqttmsg, {retain: true});
                            log.debug('[MQTT]', `SENT [${mqttmsgtopic}] ${mqttmsg}`);

                            global.minvsregistered.push(microinvertername);
                        }

                        var hexwh = hexpart.substring(36, 40);
                        var intwh = (parseInt(hexwh, 16)/8192)*1000;
                        var intwh = Math.round(intwh * 10) / 10;

                        log.verbose('[DATA - 0e]', `[${microinvertername}] MicroInverter measured energy (Wh): ${intwh}    (${hexwh})`); 
                        var mqttmsgtopic = `homeassistant/sensor/involar-${microinvertername}-energy/state`; var mqttmsg = intwh.toString();
                        client.publish(mqttmsgtopic, mqttmsg);
                        log.debug('[MQTT]', `SENT [${mqttmsgtopic}] ${mqttmsg}`);

                    } else if (hexpart == 0) {
                        log.debug('[DATA]', "Detected line empty");
                    } else if (hexpart.substring(0, 8) == egateuid && hexpart.substring(8, hexpart.lenght) == 0) {   //check if line is egate UID, else raise exception
                        log.debug('[DATA]', `Detected line egate UID`); 
                    } else {
                        log.error('[DATA]', "EXCEPTION: Invalid microinverter message part type recieved.");
                    }
                });


            } else {
                log.error('[DATA]', `EXCEPTION: Recieved microinverter data from unknown eGate. (UID ${egateuid})`);
            }
        } else {
            log.error('[DATA]', "EXCEPTION: Unknown data length recieved");

        }
        
        log.debug('[DATA]', "=======   Data processing end   ======");

	});

	socket.on('close', function(data){
		log.verbose('[TCP]', "Connection closed");
	});


});

log.info('[TCP ]', `Starting server on port ${process.env.port}`);
server.listen(process.env.port);

log.info('[MQTT]', `Connecting to MQTT server ${mqttlogin.url}...`);
var client = mqtt.connect(mqttlogin.url,{username:mqttlogin.username,password:mqttlogin.password})
client.on("connect",function(){	
    log.info('[MQTT]', `Connected`);
    global.egatesregistered = [];
    global.minvsregistered = [];
    log.info('[HADR]', 'Waiting for first connection from eGate...');
});





function handleAppExit (options, err) {
if (err) {
    console.log(err.stack)
}

if (options.cleanup) {
    global.egatesregistered.forEach(element => {
        var mqttmsgtopic = `homeassistant/sensor/involar-${element}/availability`;
        var mqttmsg = 'offline';
        client.publish(mqttmsgtopic, mqttmsg, {retain: true});
        log.debug('[MQTT]', `SENT [${mqttmsgtopic}] ${mqttmsg}`);    
    });
}

if (options.exit) {
    process.exit()
}
}

process.on('SIGINT', handleAppExit.bind(null, {
    exit: true,
    cleanup: true
  }))