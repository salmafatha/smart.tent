// smart-tent-connector.js
// Connecteur pour l'API Smart Tent

class SmartTentConnector {
    constructor() {
        this.apiUrl = window.location.origin + '/api';
        this.deviceId = 'smart_tent_001';
        this.isConnected = false;
        this.latestData = null;
        
        console.log('🏕️ Smart Tent Connector initialisé');
        console.log('📡 API URL:', this.apiUrl);
    }

    // Récupérer les données depuis l'API
    async getData() {
        try {
            const response = await fetch(`${this.apiUrl}/data/${this.deviceId}`);
            if (response.ok) {
                this.latestData = await response.json();
                this.isConnected = true;
                return this.latestData;
            }
        } catch (error) {
            console.error('❌ Erreur connexion API:', error);
            this.isConnected = false;
        }
        return null;
    }

    // Mettre à jour les éléments HTML
    async autoUpdate() {
        const data = await this.getData();
        if (!data || !data.data) {
            console.log('⚠️ Aucune donnée reçue');
            return;
        }

        const sensors = data.data.sensors || {};
        const system = data.data.system || {};
        
        console.log('📊 Mise à jour des données:', sensors);

        // ===== CONDITIONS INTÉRIEURES =====
        this.updateElement('tempInterior', sensors.temperature, '°C');
        this.updateElement('humidityInterior', sensors.humidity, '%');
        this.updateElement('gasSensor', sensors.gas_level, ' ppm');
        this.updateGasBar(sensors.gas_level);
        
        const motionText = sensors.motion_detected ? 'DÉTECTÉ' : 'Aucun';
        this.updateElement('motionInterior', motionText);

        // ===== CONDITIONS EXTÉRIEURES =====
        this.updateElement('tempExterior', sensors.temperature_ext || sensors.temperature, '°C');
        this.updateElement('humidityExterior', sensors.humidity_ext || sensors.humidity, '%');
        this.updateElement('windSpeed', sensors.wind_speed || 0, ' km/h');
        this.updateElement('motionExterior', sensors.motion_exterior ? 'DÉTECTÉ' : 'Aucun');

        // ===== SYSTÈME =====
        this.updateElement('signal4g', system.signal_strength || 75, '%');
        this.updateSignalBars(system.signal_strength || 75);
        this.updateElement('battery', system.battery_level || 85, '%');

        // ===== STATUS GÉNÉRAL =====
        this.updateConnectionStatus(this.isConnected);
        
        // Timestamp
        if (data.timestamp) {
            const time = new Date(data.timestamp).toLocaleString('fr-FR');
            console.log(`🕒 Dernière MAJ: ${time}`);
        }

        // Vérifier les alertes
        this.checkCriticalAlerts(sensors);
    }

    // Mettre à jour un élément HTML
    updateElement(id, value, suffix = '') {
        const element = document.getElementById(id);
        if (element && value !== null && value !== undefined) {
            element.textContent = value + suffix;
            this.applyStatusClass(element, id, value);
        }
    }

    // Appliquer les classes CSS selon les valeurs
    applyStatusClass(element, id, value) {
        element.classList.remove('normal', 'warning', 'critical');
        
        if (id.includes('temp') && typeof value === 'number') {
            if (value < 5 || value > 35) {
                element.classList.add('critical');
            } else if (value < 10 || value > 30) {
                element.classList.add('warning');
            } else {
                element.classList.add('normal');
            }
        }
        
        if (id.includes('gas') && typeof value === 'number') {
            if (value > 300) {
                element.classList.add('critical');
            } else if (value > 200) {
                element.classList.add('warning');
            } else {
                element.classList.add('normal');
            }
        }
        
        if (id.includes('humidity') && typeof value === 'number') {
            if (value > 85) {
                element.classList.add('warning');
            } else {
                element.classList.add('normal');
            }
        }
    }

    // Mettre à jour la barre de gaz
    updateGasBar(gasValue) {
        const gasBar = document.getElementById('gasSensorBar');
        if (gasBar && gasValue !== null) {
            const percentage = Math.min((gasValue / 500) * 100, 100);
            gasBar.style.width = percentage + '%';
            
            if (gasValue > 300) {
                gasBar.className = 'battery-fill critical';
            } else if (gasValue > 200) {
                gasBar.className = 'battery-fill low';
            } else {
                gasBar.className = 'battery-fill';
            }
        }
    }

    // Mettre à jour les barres de signal
    updateSignalBars(signalStrength) {
        const signalBars = document.getElementById('signal-bars');
        if (signalBars) {
            const bars = signalBars.querySelectorAll('.bar');
            const activeBars = Math.ceil((signalStrength / 100) * bars.length);
            
            bars.forEach((bar, index) => {
                if (index < activeBars) {
                    bar.style.backgroundColor = '#4CAF50';
                    bar.style.height = `${10 + (index * 4)}px`;
                } else {
                    bar.style.backgroundColor = '#ddd';
                    bar.style.height = '6px';
                }
            });
        }
    }

    // Mettre à jour le statut de connexion
    updateConnectionStatus(isOnline) {
        const statusElement = document.getElementById('connectionStatus');
        const indicator = document.getElementById('status-indicator');
        
        if (statusElement) {
            statusElement.textContent = isOnline ? 'En ligne' : 'Hors ligne';
            statusElement.className = `status-indicator ${isOnline ? 'online' : 'offline'}`;
        }
        
        if (indicator) {
            indicator.className = isOnline ? 'online' : 'offline';
        }
    }

    // Vérifier les alertes critiques
    checkCriticalAlerts(sensors) {
        const alertsDiv = document.getElementById('criticalAlerts');
        
        if (!alertsDiv) return;
        
        let hasAlert = false;
        let alertMessage = '';
        
        if (sensors.gas_level > 300) {
            hasAlert = true;
            alertMessage = `⚠️ ALERTE GAZ! Niveau détecté: ${sensors.gas_level} ppm - Ventilez immédiatement`;
        }
        
        if (sensors.temperature < 0 || sensors.temperature > 40) {
            hasAlert = true;
            alertMessage = `🌡️ TEMPÉRATURE EXTRÊME! ${sensors.temperature}°C - Vérifiez les conditions`;
        }
        
        if (hasAlert) {
            alertsDiv.classList.add('visible');
            const alertContent = alertsDiv.querySelector('.alert-content div');
            if (alertContent) {
                alertContent.innerHTML = alertMessage;
            }
        } else {
            alertsDiv.classList.remove('visible');
        }
    }

    // Démarrer la mise à jour automatique
    startAutoUpdate(intervalSeconds = 10) {
        this.autoUpdate();
        
        setInterval(() => {
            this.autoUpdate();
        }, intervalSeconds * 1000);
        
        console.log(`🔄 Mise à jour automatique: ${intervalSeconds}s`);
    }

    // Envoyer des données (pour le Raspberry Pi)
    async sendData(data) {
        try {
            const response = await fetch(`${this.apiUrl}/data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    device_id: this.deviceId,
                    timestamp: new Date().toISOString(),
                    ...data
                })
            });
            return response.ok;
        } catch (error) {
            console.error('❌ Erreur envoi:', error);
            return false;
        }
    }
}

// Instance globale
window.smartTent = new SmartTentConnector();

// Fonction pour masquer les alertes
function dismissCriticalAlert() {
    const alertsDiv = document.getElementById('criticalAlerts');
    if (alertsDiv) {
        alertsDiv.classList.remove('visible');
    }
}

// CSS pour les statuts
const statusStyles = `
    .normal { color: #4CAF50 !important; }
    .warning { color: #FF9500 !important; }
    .critical { 
        color: #FF4444 !important; 
        font-weight: bold !important;
        animation: pulse 1s infinite;
    }
    
    .status-indicator.online { color: #4CAF50; }
    .status-indicator.offline { color: #FF4444; }
    
    @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.7; }
        100% { opacity: 1; }
    }
`;

// Injecter le CSS
const style = document.createElement('style');
style.textContent = statusStyles;
document.head.appendChild(style);

// Démarrage automatique
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Smart Tent Dashboard initialisation...');
    
    setTimeout(() => {
        window.smartTent.startAutoUpdate(10);
    }, 1000);
});

console.log('📱 Smart Tent Connector chargé et prêt !');
