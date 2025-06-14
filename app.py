from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Stockage simple des données
devices_data = {}

# Route pour la page principale
@app.route('/')
def index():
    return render_template("sensor.html")

@app.route('/sensor')
def sensor_page():
    return render_template("sensor.html")

# API pour recevoir les données du Raspberry Pi
@app.route('/api/data', methods=['GET', 'POST'])
def api_data():
    if request.method == 'POST':
        try:
            data = request.get_json()
            device_id = data.get("device_id", "smart_tent_001")
            
            # Stocker les données
            devices_data[device_id] = {
                "timestamp": datetime.now().isoformat(),
                "data": data
            }
            
            print(f"✅ Données reçues de {device_id}")
            print(f"Capteurs: {data.get('sensors', {})}")
            
            return jsonify({"success": True})
            
        except Exception as e:
            print(f"❌ Erreur: {e}")
            return jsonify({"error": str(e)}), 500
    
    # GET - Retourner les données
    return jsonify(devices_data)

# API pour un device spécifique
@app.route('/api/data/<device_id>')
def get_device_data(device_id):
    if device_id in devices_data:
        return jsonify(devices_data[device_id])
    return jsonify({"error": "Device not found"}), 404

# API de statut
@app.route('/api/status')
def api_status():
    return jsonify({
        "status": "online",
        "timestamp": datetime.now().isoformat(),
        "device_count": len(devices_data)
    })

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)
    app.run(host='0.0.0.0', port=port, debug=False)
