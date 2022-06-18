# Involar HomeAssistant bridge

This nodejs script sends your involar eGate data to home assistant.

## Starting the script
The most simple way is to connect to a Home Assistant Installation.
1. Install the Mosquitto broke Add-on and configure Integration.
2. Add an user in the add-on's config options.
3. Change the settings at the top of `server.js` to your HaOS IP and mqtt username/password
4. In the directory of the script, run: `npm install npmlog moment request` (make sure nodejs is installed)
5. Start script with: `node server.js`
6. My eGate uses port 1020. If nothing is recieved, try changing `server.listen('1020');` to `server.listen('9800');`
7. It's recommended to change log.level to info or error (at top of file). If everything works of course.

## Redirecting the eGate to your server
Luckily the eGate is a quite simple device, with not much security.
There are no settings in the eGate. The LAN port gets an IP via DHCP.
The DNS server in the DHCP options is used. The eGate looks up the record "www.involar.eu".
This record should be changed to your own server. The eGate will then use this script instead of defunct SEDAS. 
Notice, other values have been seen for this. Look for what the eGate uses at your DNS server logs, or mirror a network port and use wireshark.
The dns record can be redirected in your DNS server settings. I included an edgeOS example below. Same can be easily done with pihole for example.

### Ubiquiti edgeOS example
1. Configure EdgeOS DNS relay and set DHCP options to only use this DNS server. I think this is the default config, but if not make sure things are setup this way.
2. Look at DNS queries after plugging in the eGate to your network (see https://nmaggioni.xyz/2018/02/17/Logging-DNS-queries-on-your-EdgeRouter/)
run `configure; delete service dns forwarding options log-queries; commit; save;` to disable again
3. Run on EdgeOS in `configure` mode: `set service dns forwarding options address=/www.involar.eu/10.1.2.3` with the IP of the server where this script is running on. Replace www.involar.eu with whatever address your eGate uses. Make sure to `commit` and `save`.
4. Restart eGate. For me it also took a while for it to work. Probably the old IP was cached somewhere.

## Issues?
Please let me know using the github issues.
This script should support multiple eGates, but this is untested as i only have one.


## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments

* Thanx to Ad Boerma for helping me out with decoding the Egate messages and calculate the correct values
