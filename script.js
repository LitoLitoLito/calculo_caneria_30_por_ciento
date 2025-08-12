// Variables globales
let tablaDatos = [];
let consumosAcumulados = [];
let totalConsumo = 0;
let todosLosRegistros = [];

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    // Ocultar secciones inicialmente
    document.getElementById('resultados-section').style.display = 'none';
    document.getElementById('resumen-final-section').style.display = 'none';
    document.getElementById('consumos-agregados').style.display = 'none';
    document.getElementById('finalizar-btn').style.display = 'none';
    document.getElementById('cargando-datos').style.display = 'block';

    // Cargar datos y configurar eventos
    cargarDatosTabla().finally(() => {
        document.getElementById('cargando-datos').style.display = 'none';
        configurarEventos();
    });
});

// Cargar datos del JSON
async function cargarDatosTabla() {
    try {
        const response = await fetch('./data/convertcsv.json');
        if (!response.ok) throw new Error(`Error al cargar datos: ${response.status}`);
        
        const datosCrudos = await response.json();
        tablaDatos = transformarDatos(datosCrudos);
        console.log('Datos de tabla cargados:', tablaDatos);
    } catch (error) {
        console.error('Error al cargar JSON:', error);
        alert('Error al cargar los datos. Recarga la página.');
    }
}

// Transformar estructura de datos
function transformarDatos(datosCrudos) {
    const columnas = datosCrudos[0];
    return datosCrudos.slice(1).map(fila => {
        const obj = {};
        for (const key in columnas) {
            const nombreCol = columnas[key];
            obj[nombreCol] = isNaN(fila[key]) ? fila[key] : Number(fila[key]);
        }
        return obj;
    });
}

// Configurar todos los eventos
function configurarEventos() {
    // Botón Agregar Consumo
    document.getElementById('agregar-consumo-btn').addEventListener('click', function() {
        const inputConsumo = document.getElementById('tramo-consumo');
        const consumo = parseFloat(inputConsumo.value);
        
        if (!isNaN(consumo)) {
            if (consumo > 0) {
                consumosAcumulados.push(consumo);
                totalConsumo += consumo;
                actualizarListaConsumos();
                inputConsumo.value = '';
            } else {
                alert('El consumo debe ser mayor que 0');
            }
        } else {
            alert('Ingrese un valor numérico válido');
        }
    });

    // Botón Calcular
    // Botón Calcular
document.getElementById('calcular-btn').addEventListener('click', function() {
    if (tablaDatos.length === 0) {
        alert('Los datos de la tabla aún no se han cargado. Por favor espere.');
        return;
    }

    const nombreTramo = document.getElementById('tramo-nombre').value.trim() || "Sin nombre";
    const longitudReal = parseFloat(document.getElementById('tramo-longitud').value) || 0;
    
    // Usar consumos acumulados si existen, de lo contrario el valor actual del input
    let consumoTotal;
    if (consumosAcumulados.length > 0) {
        consumoTotal = totalConsumo;
    } else {
        const consumoInput = parseFloat(document.getElementById('tramo-consumo').value) || 0;
        if (consumoInput > 0) {
            consumoTotal = consumoInput;
        } else {
            alert('Debe ingresar al menos un consumo válido');
            return;
        }
    }

        // Realizar cálculos
    const resultados = calcularResultados(nombreTramo, longitudReal, consumoTotal);
    
    // Guardar y mostrar resultados
    todosLosRegistros.push(resultados);
    mostrarResultados(resultados);
    document.getElementById('finalizar-btn').style.display = 'inline-block';

    // 🔹 Limpiar solo los campos y consumos acumulados, pero NO el resultado
    document.getElementById('tramo-nombre').value = '';
    document.getElementById('tramo-longitud').value = '';
    document.getElementById('tramo-consumo').value = '';
    consumosAcumulados = [];
    totalConsumo = 0;
    document.getElementById('lista-consumos').innerHTML = '';
    document.getElementById('total-consumo').textContent = '0';
    document.getElementById('consumos-agregados').style.display = 'none';
});

    // Botón Mostrar Resumen
    document.getElementById('finalizar-btn').addEventListener('click', function() {
        mostrarResumen();
    });

    // Botón Cancelar
    document.getElementById('cancelar-btn').addEventListener('click', function() {
        if (confirm('¿Está seguro de cancelar? Se perderán todos los datos.')) {
            reiniciarFormulario();
        }
    });

    // Botón Descargar
    document.getElementById('descargar-btn').addEventListener('click', descargarDatos);

    // Botón Copiar
    document.getElementById('copiar-btn').addEventListener('click', copiarDatos);
}

// Actualizar lista de consumos
function actualizarListaConsumos() {
    const lista = document.getElementById('lista-consumos');
    lista.innerHTML = consumosAcumulados.map((consumo, i) => 
        `<li>Consumo ${i+1}: ${consumo} Kcal/h</li>`
    ).join('');

    document.getElementById('total-consumo').textContent = totalConsumo;
    document.getElementById('consumos-agregados').style.display = 'block';
}

// Calcular resultados
function calcularResultados(nombreTramo, longitudReal, consumoTotal) {
    const longitudCalculo = longitudReal * 1.3;
    const longitudTabla = encontrarValorSuperior(longitudCalculo, 'longitud');
    const caudalCalculo = (consumoTotal / 9800) * 1000;
    const diametro = encontrarDiametro(caudalCalculo, longitudTabla);

    return {
        nombreTramo,
        longitudReal,
        longitudCalculo,
        longitudTabla,
        consumoTotal,
        caudalCalculo,
        diametro: diametro.columna,
        valorCaudal: diametro.valor,
        fecha: new Date().toLocaleString()
    };
}

// Encontrar valor superior en la tabla
function encontrarValorSuperior(valor, columna) {
    const valores = tablaDatos.map(item => item[columna]).sort((a, b) => a - b);
    return valores.find(v => v >= valor) || valores[valores.length - 1];
}

// Encontrar diámetro adecuado
function encontrarDiametro(caudal, longitud) {
    const fila = tablaDatos.find(f => f.longitud === longitud);
    if (!fila) return { columna: "No encontrado", valor: 0 };

    const { longitud: _, ...diametros } = fila;
    const columnas = Object.entries(diametros).sort((a, b) => a[1] - b[1]);

    for (const [columna, valor] of columnas) {
        if (valor >= caudal) return { columna, valor };
    }

    return columnas[columnas.length - 1];
}

// Mostrar resultados
function mostrarResultados(resultados) {
    const container = document.getElementById('resultados-actuales');
    container.innerHTML = `
        <div class="resultado-item">
            <span class="resultado-label">Tramo:</span>
            <span class="resultado-valor">${resultados.nombreTramo}</span>
        </div>
        <div class="resultado-item">
            <span class="resultado-label">Longitud Real:</span>
            <span class="resultado-valor">${resultados.longitudReal} m</span>
        </div>
        <div class="resultado-item">
            <span class="resultado-label">Longitud Cálculo (+30%):</span>
            <span class="resultado-valor">${resultados.longitudCalculo.toFixed(2)} m</span>
        </div>
        <div class="resultado-item">
            <span class="resultado-label">Longitud según Tabla:</span>
            <span class="resultado-valor">${resultados.longitudTabla} m</span>
        </div>
        <div class="resultado-item">
            <span class="resultado-label">Consumo Total:</span>
            <span class="resultado-valor">${resultados.consumoTotal} Kcal/h</span>
        </div>
        <div class="resultado-item">
            <span class="resultado-label">Caudal según Cálculo:</span>
            <span class="resultado-valor">${resultados.caudalCalculo.toFixed(2)}</span>
        </div>
        <div class="resultado-item">
            <span class="resultado-label">Caudal según Tabla:</span>
            <span class="resultado-valor">${resultados.valorCaudal}</span>
        </div>
        <div class="resultado-item">
            <span class="resultado-label">Diámetro recomendado:</span>
            <span class="diametro">${resultados.diametro}</span>
        </div>
    `;

    document.getElementById('resultados-section').style.display = 'block';
}

// Mostrar resumen
function mostrarResumen() {
    const container = document.getElementById('resumen-final');
    
    if (todosLosRegistros.length === 0) {
        container.innerHTML = '<p class="empty-message">No hay datos registrados</p>';
    } else {
        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Tramo</th>
                        <th>Long. Real</th>
                        <th>Long. Tabla</th>
                        <th>Consumo</th>
                        <th>Caudal Calc.</th>
                        <th>Caudal Tabla</th>
                        <th>Diámetro</th>
                    </tr>
                </thead>
                <tbody>
                    ${todosLosRegistros.map(registro => `
                        <tr>
                            <td>${registro.nombreTramo}</td>
                            <td>${registro.longitudReal} m</td>
                            <td>${registro.longitudTabla} m</td>
                            <td>${registro.consumoTotal} Kcal/h</td>
                            <td>${registro.caudalCalculo.toFixed(2)}</td>
                            <td>${registro.valorCaudal}</td>
                            <td>${registro.diametro}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    document.getElementById('resumen-final-section').style.display = 'block';
    document.getElementById('resultados-section').style.display = 'none';
}

// Reiniciar formulario
function reiniciarFormulario() {
    document.getElementById('tramo-nombre').value = '';
    document.getElementById('tramo-longitud').value = '';
    document.getElementById('tramo-consumo').value = '';
    document.getElementById('resultados-actuales').innerHTML = '';
    document.getElementById('resumen-final').innerHTML = '';
    document.getElementById('lista-consumos').innerHTML = '';
    document.getElementById('total-consumo').textContent = '0';
    document.getElementById('resultados-section').style.display = 'none';
    document.getElementById('resumen-final-section').style.display = 'none';
    document.getElementById('consumos-agregados').style.display = 'none';
    document.getElementById('finalizar-btn').style.display = 'none';
    consumosAcumulados = [];
    totalConsumo = 0;
}

// Descargar datos
function descargarDatos() {
    if (todosLosRegistros.length === 0) {
        alert('No hay datos para descargar');
        return;
    }

    let csv = 'Nombre,Longitud Real,Longitud Cálculo,Longitud Tabla,Consumo,Caudal Cálculo,Caudal Tabla,Diámetro,Fecha\n';
    todosLosRegistros.forEach(reg => {
        csv += `"${reg.nombreTramo}",${reg.longitudReal},${reg.longitudCalculo.toFixed(2)},${reg.longitudTabla},${reg.consumoTotal},${reg.caudalCalculo.toFixed(2)},${reg.valorCaudal},"${reg.diametro}","${reg.fecha}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calculos_caneria_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Copiar datos
function copiarDatos() {
    if (todosLosRegistros.length === 0) {
        alert('No hay datos para copiar');
        return;
    }

    const texto = todosLosRegistros.map(reg => 
        `Tramo: ${reg.nombreTramo}\n` +
        `Longitud Real: ${reg.longitudReal} m\n` +
        `Longitud Cálculo: ${reg.longitudCalculo.toFixed(2)} m\n` +
        `Longitud Tabla: ${reg.longitudTabla} m\n` +
        `Consumo Total: ${reg.consumoTotal} Kcal/h\n` +
        `Caudal Cálculo: ${reg.caudalCalculo.toFixed(2)}\n` +
        `Caudal Tabla: ${reg.valorCaudal}\n` +
        `Diámetro: ${reg.diametro}\n` +
        `Fecha: ${reg.fecha}\n` +
        '------------------------'
    ).join('\n\n');

    navigator.clipboard.writeText(texto).then(() => {
        alert('Datos copiados al portapapeles');
    }).catch(err => {
        console.error('Error al copiar:', err);
        alert('Error al copiar los datos');
    });
}