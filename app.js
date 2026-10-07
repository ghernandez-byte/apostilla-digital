// Clave para almacenamiento en LocalStorage
const STORAGE_KEY = 'apostilla_tramites_db';
// REEMPLAZÁ EL TEXTO ENTRE COMILLAS CON TU URL DE GOOGLE APPS SCRIPT:
const GOOGLE_SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbyCTFS0XQmEE0hXYvD4Q8S2Al6rSMR3X6_H3J1G9hw1959aID_tlG0bIPO_QpZxp-O8/exec';

// Inicialización de la App
document.addEventListener('DOMContentLoaded', () => {
    renderizarTabla();

    // Cargar API Key previa si existe
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
        document.getElementById('api-key').value = savedKey;
    }
});

// Guardar API Key localmente al cambiar
document.getElementById('api-key')?.addEventListener('change', (e) => {
    localStorage.setItem('gemini_api_key', e.target.value);
});

// 1. NAVEGACIÓN ENTRE VISTAS
function cambiarVista(vista) {
    const vistaCliente = document.getElementById('vista-cliente');
    const vistaAdmin = document.getElementById('vista-admin');
    const btnCliente = document.getElementById('btn-tab-cliente');
    const btnAdmin = document.getElementById('btn-tab-admin');

    if (vista === 'cliente') {
        vistaCliente.classList.remove('hidden');
        vistaAdmin.classList.add('hidden');
        btnCliente.className = "px-4 py-2 rounded-lg bg-indigo-800 text-white text-sm font-semibold";
        btnAdmin.className = "px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-900";
    } else {
        vistaCliente.classList.add('hidden');
        vistaAdmin.classList.remove('hidden');
        btnAdmin.className = "px-4 py-2 rounded-lg bg-indigo-800 text-white text-sm font-semibold";
        btnCliente.className = "px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-900";
        renderizarTabla(); // Actualizar datos en la vista admin
    }
}

// 2. REGISTRO Y PERSISTENCIA DE DATOS
function guardarTramite(event) {
    event.preventDefault();

    // Generar ID único de ticket y marca temporal
    const ticketId = 'AP-' + Math.floor(100000 + Math.random() * 900000);
    const fechaHora = new Date().toLocaleString('es-AR');

    const nuevoTramite = {
        ticketId,
        fechaHora,
        nombre: document.getElementById('nombre').value,
        dni: document.getElementById('dni').value,
        email: document.getElementById('email').value,
        telefono: document.getElementById('telefono').value,
        tipoDoc: document.getElementById('tipoDoc').value,
        observaciones: document.getElementById('observaciones').value,
        estado: 'Ingresado'
    };

    // --- PERSISTENCIA LOCAL (LocalStorage) ---
    const tramites = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    tramites.unshift(nuevoTramite); // Agregar al inicio
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tramites));

    // --- PERSISTENCIA EN NUBE (Google Sheets Webhook) ---
    if (GOOGLE_SHEETS_WEBHOOK_URL && GOOGLE_SHEETS_WEBHOOK_URL !== 'PEGA_AQUI_TU_URL_DE_APPS_SCRIPT') {
        fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
            method: 'POST',
            mode: 'no-cors', // Permite enviar datos desde el navegador a Apps Script sin problemas de CORS
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoTramite)
        })
            .then(() => console.log('✅ Datos guardados en Google Sheets correctamente.'))
            .catch(err => console.error('❌ Error guardando en Google Sheets:', err));
    }

    // --- FEEDBACK VISUAL AL USUARIO ---
    document.getElementById('ticket-numero').innerText = ticketId;
    document.getElementById('mensaje-exito').classList.remove('hidden');
    document.getElementById('form-apostilla').reset();

    // Ocultar cartel de confirmación tras 8 segundos
    setTimeout(() => {
        document.getElementById('mensaje-exito').classList.add('hidden');
    }, 8000);
}

// 3. RENDERIZAR TABLA EN DASHBOARD
function renderizarTabla() {
    const tramites = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const tbody = document.getElementById('tabla-tramites');

    if (tramites.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-400">No hay trámites registrados aún.</td></tr>`;
        return;
    }

    tbody.innerHTML = tramites.map(t => `
    <tr class="border-b hover:bg-slate-50">
      <td class="p-3 font-mono font-bold text-indigo-700">${t.ticketId}</td>
      <td class="p-3 text-slate-500">${t.fechaHora}</td>
      <td class="p-3 font-medium">${t.nombre}</td>
      <td class="p-3 text-slate-600">${t.dni}</td>
      <td class="p-3"><span class="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-semibold">${t.tipoDoc}</span></td>
      <td class="p-3"><span class="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs font-bold">${t.estado}</span></td>
    </tr>
  `).join('');
}

// 4. INTEGRACIÓN CON GEMINI API
async function analizarConGemini() {
    const apiKey = document.getElementById('api-key').value.trim();
    const contenedorResultado = document.getElementById('resultado-gemini');
    const btnAnalizar = document.getElementById('btn-analizar');

    if (!apiKey) {
        alert('Por favor ingresá tu API Key de Gemini para ejecutar el análisis.');
        return;
    }

    const tramites = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (tramites.length === 0) {
        alert('No hay trámites registrados para analizar.');
        return;
    }

    btnAnalizar.disabled = true;
    btnAnalizar.innerText = 'Analizando con Gemini... ⏳';
    contenedorResultado.classList.remove('hidden');
    contenedorResultado.innerHTML = '<em>Procesando datos con Gemini IA...</em>';

    // Preparar los datos a enviar
    const datosResumidos = tramites.map(t => ({
        tipoDoc: t.tipoDoc,
        fecha: t.fechaHora,
        observaciones: t.observaciones
    }));

    const prompt = `
Actúa como un Analista de Operaciones Senior. 
Analiza los siguientes trámites de apostilla ingresados en el día de hoy:
${JSON.stringify(datosResumidos, null, 2)}

Por favor, genera un informe breve y estructurado en texto plano con los siguientes 3 puntos:
1. 📊 RESUMEN OPERATIVO: Cantidad total de trámites y desglose por tipo de documento.
2. ⏱️ ESTIMACIÓN DE CARGA Y TIEMPOS: Tiempo medio estimado de procesamiento general.
3. 💡 RECOMENDACIONES Y ALERTAS: Detección de posibles cuellos de botella o priorización sugerida.
`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();

        if (data.candidates && data.candidates[0].content.parts[0].text) {
            contenedorResultado.innerText = data.candidates[0].content.parts[0].text;
        } else {
            contenedorResultado.innerText = 'Error al obtener respuesta de Gemini. Revisa la validez de tu API Key.';
        }
    } catch (error) {
        console.error('Error:', error);
        contenedorResultado.innerText = 'Error de conexión con la API de Gemini.';
    } finally {
        btnAnalizar.disabled = false;
        btnAnalizar.innerHTML = '<span>✨</span> Analizar Trámites con Gemini';
    }
}

// Limpiar historial
function limpiarRegistros() {
    if (confirm('¿Estás seguro de borrar todos los trámites cargados?')) {
        localStorage.removeItem(STORAGE_KEY);
        renderizarTabla();
        document.getElementById('resultado-gemini').classList.add('hidden');
    }
}