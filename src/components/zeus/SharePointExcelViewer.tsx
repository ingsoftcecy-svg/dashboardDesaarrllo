import React, { useState } from 'react';
import { FileSpreadsheet, ExternalLink, RefreshCw, Eye, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';

interface PresetFile {
  title: string;
  category: string;
  defaultUrl: string;
  description: string;
}

const PRESET_FILES: PresetFile[] = [
  {
    title: "Guías Técnicas Elaboración (L6, L7, L8)",
    category: "Habilitación Técnica",
    defaultUrl: "https://anheuserbuschinbev.sharepoint.com/sites/MAZ3/bo/_layouts/15/Doc.aspx?sourcedoc={guias_id}&action=embedview",
    description: "Matriz interactiva de habilitación por niveles L6, L7 y L8 para todos los equipos de Elaboración."
  },
  {
    title: "DATOS - Matriz SKAP y Autonomía",
    category: "Autonomía TPM",
    defaultUrl: "https://anheuserbuschinbev.sharepoint.com/sites/MAZ3/bo/_layouts/15/Doc.aspx?sourcedoc={datos_id}&action=embedview",
    description: "Matriz de 8 factores de autonomía por colaborador y equipo."
  },
  {
    title: "Cursos y Capacitación",
    category: "Formación",
    defaultUrl: "https://anheuserbuschinbev.sharepoint.com/sites/MAZ3/bo/_layouts/15/Doc.aspx?sourcedoc={cursos_id}&action=embedview",
    description: "Seguimiento de horas y estado de cursos aprobados/pendientes."
  }
];

export function SharePointExcelViewer() {
  const [selectedPreset, setSelectedPreset] = useState<number>(0);
  const [customEmbedUrl, setCustomEmbedUrl] = useState<string>('');
  const [activeUrl, setActiveUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleLoadEmbed = (url: string) => {
    setIsLoading(true);
    setActiveUrl(url);
    setTimeout(() => setIsLoading(false), 1500);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-8 -translate-y-8">
          <FileSpreadsheet className="w-96 h-96" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-yellow-400 text-xs font-semibold tracking-wider uppercase mb-1">
              <Sparkles className="w-4 h-4" />
              Sincronización Directa Nube-a-Nube
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Visor y Editor de Excel Online (SharePoint)</h2>
            <p className="text-blue-100 text-sm mt-1 max-w-2xl">
              Visualiza y edita los libros oficiales de SharePoint en tiempo real directamente desde tu dashboard, sin descargas locales ni intermediarios.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/30">
              <ShieldCheck className="w-4 h-4" />
              Sesión AB InBev Protegida
            </span>
          </div>
        </div>
      </div>

      {/* Preset Selectors & Custom URL input */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PRESET_FILES.map((file, idx) => (
          <div
            key={idx}
            onClick={() => {
              setSelectedPreset(idx);
              if (customEmbedUrl) {
                handleLoadEmbed(customEmbedUrl);
              }
            }}
            className={`cursor-pointer rounded-xl p-4 transition-all duration-200 border text-left ${
              selectedPreset === idx && !customEmbedUrl
                ? 'bg-blue-50/80 border-blue-500 shadow-md ring-2 ring-blue-400/30'
                : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-100/60 px-2 py-0.5 rounded">
                {file.category}
              </span>
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-800 text-sm">{file.title}</h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{file.description}</p>
          </div>
        ))}
      </div>

      {/* URL Input Bar */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
        <label className="block text-sm font-semibold text-slate-700">
          Pegar Vínculo de Inserción (Embed Link) o Vínculo de SharePoint:
        </label>
        
        <div className="flex gap-2">
          <input
            type="url"
            value={customEmbedUrl}
            onChange={(e) => setCustomEmbedUrl(e.target.value)}
            placeholder="Pega aquí el enlace de SharePoint o enlace de inserción de Excel Online..."
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
          />
          
          <button
            onClick={() => handleLoadEmbed(customEmbedUrl)}
            disabled={!customEmbedUrl}
            className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shadow-sm"
          >
            <Eye className="w-4 h-4" />
            Cargar Visor
          </button>
        </div>

        {/* Guía rápida de obtención de enlace */}
        <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 border border-slate-200/80 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-700">¿Cómo obtener el vínculo de inserción desde SharePoint?</span>
            <p className="mt-0.5">
              1. Abre el Excel en SharePoint -&gt; 2. Haz clic en <strong>Archivo (File)</strong> -&gt; 3. Haz clic en <strong>Compartir (Share)</strong> -&gt; 4. Selecciona <strong>Insertar (Embed)</strong> y copia el código o la URL del iframe.
            </p>
          </div>
        </div>
      </div>

      {/* Frame Container */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl min-h-[600px] flex flex-col">
        <div className="bg-slate-800/90 px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
            <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" />
            <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
            <span className="ml-3 text-xs text-slate-300 font-mono">
              {activeUrl ? 'Excel Online — Sesión Activa' : 'Selecciona o pega un libro para iniciar la vista previa'}
            </span>
          </div>

          {activeUrl && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleLoadEmbed(activeUrl)}
                className="text-xs text-slate-300 hover:text-white flex items-center gap-1 bg-slate-700/60 px-2.5 py-1 rounded"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                Refrescar
              </button>

              <a
                href={activeUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-900/40 px-2.5 py-1 rounded"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Abrir en SharePoint
              </a>
            </div>
          )}
        </div>

        <div className="flex-1 bg-slate-950 flex items-center justify-center relative min-h-[550px]">
          {isLoading && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-20 flex items-center justify-center text-white text-sm gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />
              Cargando libro de trabajo desde SharePoint...
            </div>
          )}

          {activeUrl ? (
            <iframe
              src={activeUrl}
              className="w-full h-full min-h-[550px] border-0"
              title="Visor Excel Online SharePoint"
              allowFullScreen
            />
          ) : (
            <div className="text-center p-8 max-w-md">
              <FileSpreadsheet className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-white font-semibold text-base mb-1">Visor de Excel Online Listo</h3>
              <p className="text-slate-400 text-xs mb-4">
                Pega la URL de tu archivo en SharePoint en la casilla superior para incrustar el editor interactivo de Excel Online en tiempo real.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
