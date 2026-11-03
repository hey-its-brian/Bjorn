let fontSize = 12;
// Adjust font size based on device type
if (/Mobi|Android/i.test(navigator.userAgent)) {
    fontSize = 7; // size for mobile
}

function fetchNetworkData() {
    fetch('/network_data')
        .then(response => response.text())
        .then(data => {
            document.getElementById('network-table').innerHTML = data;
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function adjustNetworkFontSize(change) {
    fontSize += change;
    document.getElementById('network-table').style.fontSize = fontSize + 'px';
}

function toggleNetworkToolbar() {
    const mainToolbar = document.querySelector('.toolbar');
    const toggleButton = document.getElementById('toggle-toolbar');
    const toggleIcon = document.getElementById('toggle-icon');

    if (mainToolbar.classList.contains('hidden')) {
        mainToolbar.classList.remove('hidden');
        toggleIcon.src = '/web/images/hide.png';
        toggleButton.setAttribute('data-open', 'true');
    } else {
        mainToolbar.classList.add('hidden');
        toggleIcon.src = '/web/images/reveal.png';
        toggleButton.setAttribute('data-open', 'false');
    }
}







// ---- Target network selection -------------------------------------------
// Lets the user point Bjorn at any reachable subnet instead of being tied to
// the one behind the default gateway. Persisted via /save_config and honoured
// by NetworkScanner.get_network() on the next scan cycle.
function populateTargetNetworks(data) {
    const select = document.getElementById('target-network-select');
    const status = document.getElementById('target-network-status');
    const manual = document.getElementById('target-network-manual');
    if (!select) return;
    select.innerHTML = '';

    const autoOpt = document.createElement('option');
    autoOpt.value = '';
    autoOpt.textContent = data.auto
        ? 'Auto-detect (currently ' + data.auto + ')'
        : 'Auto-detect';
    select.appendChild(autoOpt);

    (data.networks || []).forEach(function (net) {
        const opt = document.createElement('option');
        opt.value = net.subnet;
        opt.textContent = net.subnet + '  (' + net.interface + ' @ ' + net.ip + ')';
        select.appendChild(opt);
    });

    const current = (data.current || '').trim();
    let matched = false;
    for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value === current) {
            select.selectedIndex = i;
            matched = true;
            break;
        }
    }
    if (!matched && current && manual) {
        manual.value = current;
    }
    if (status) {
        status.textContent = current
            ? 'Current target: ' + current
            : 'Current target: auto-detect' + (data.auto ? ' (' + data.auto + ')' : '');
    }
}

function loadTargetNetworks() {
    fetch('/list_networks')
        .then(function (r) { return r.json(); })
        .then(populateTargetNetworks)
        .catch(function (err) { console.error('Error loading networks:', err); });
}

function refreshTargetNetworks() {
    const status = document.getElementById('target-network-status');
    if (status) status.textContent = 'Rescanning interfaces...';
    loadTargetNetworks();
}

function applyTargetNetwork() {
    const select = document.getElementById('target-network-select');
    const manual = document.getElementById('target-network-manual');
    const status = document.getElementById('target-network-status');
    const value = (manual && manual.value.trim())
        ? manual.value.trim()
        : (select ? select.value : '');

    fetch('/save_config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scan_target_subnet: value })
    })
        .then(function (r) { return r.json(); })
        .then(function () {
            if (status) {
                status.textContent = value
                    ? 'Target set to ' + value + '. Takes effect on the next scan cycle.'
                    : 'Target set to auto-detect. Takes effect on the next scan cycle.';
            }
            if (manual) manual.value = '';
            loadTargetNetworks();
        })
        .catch(function (err) {
            if (status) status.textContent = 'Error saving target: ' + err;
        });
}

document.addEventListener("DOMContentLoaded", function() {
    fetchNetworkData(); // Initial fetch
    loadTargetNetworks(); // Load the target-network selector
    setInterval(fetchNetworkData, 60000); // Refresh every 60 seconds
});
