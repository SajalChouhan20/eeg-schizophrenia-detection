import { useState } from "react";

function App() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState(null);

  const toggleAccordion = (index) => {
    setActiveAccordion(activeAccordion === index ? null : index);
  };

  const uploadFile = async () => {
    if (!file) {
      alert("Please upload a file first!");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setResult("");
    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:5000/predict", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      setLoading(false);
      setResult(data.prediction || data.error);

    } catch (error) {
      setLoading(false);
      setResult("Server Error!");
    }
  };

  const infoSections = [
    {
      title: "What is schizophrenia?",
      content: "Schizophrenia is a serious mental illness that affects how a person thinks, feels, and behaves. People with schizophrenia may seem as though they have lost touch with reality, which can be distressing for them and for their family and friends. It is usually first diagnosed between the ages of 16 and 30."
    },
    {
      title: "What are the Symptoms?",
      content: (
        <ul className="list-disc pl-5 space-y-2 text-slate-400">
          <li><strong>Delusions:</strong> False beliefs not based in reality.</li>
          <li><strong>Hallucinations:</strong> Seeing or hearing things that others don't observe.</li>
          <li><strong>Disorganized thinking/speech:</strong> Fragmented or incoherent communication.</li>
          <li><strong>Motor behavior:</strong> Unpredictable agitation or childlike silliness.</li>
          <li><strong>Negative symptoms:</strong> Reduced ability to function, lack of emotion, or social withdrawal.</li>
        </ul>
      )
    },
    {
      title: "What are the Causes?",
      content: "Variations in many genes contribute to risk, combined with environmental factors like exposure to infections before birth or severe stress. Research also indicates that regular and heavy cannabis use, particularly high-THC products starting in adolescence, is associated with an increased risk."
    },
    {
      title: "Available Treatments",
      content: "Treatment involves a combination of antipsychotic medications (Atypical/Typical), psychosocial interventions like CBT for Psychosis, and support services. Long-Acting Injectables (LAIs) are often used to improve treatment adherence."
    }
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      {/* Decorative Blobs */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full"></div>
      </div>

      {/* Header */}
      <header className="container mx-auto px-6 py-8 flex justify-between items-center border-b border-slate-800/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3 group">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20 group-hover:scale-110 transition-transform">
            <span className="text-2xl">🧠</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white leading-none">NeuroScan AI</h1>
            <p className="text-[10px] text-indigo-400 uppercase tracking-widest mt-1 font-semibold">Diagnostic EEG Platform</p>
          </div>
        </div>
        <nav className="hidden md:block">
          <ul className="flex gap-8 text-sm font-medium text-slate-400">
            <li><a href="#" className="hover:text-white transition-colors">Analyzer</a></li>
            <li><a href="#about" className="hover:text-white transition-colors">Medical Info</a></li>
            <li><a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC2864503/" target="_blank" className="hover:text-white transition-colors">Resources</a></li>
          </ul>
        </nav>
      </header>

      <main className="container mx-auto px-6 pt-16 pb-24 grid lg:grid-cols-12 gap-12 items-start">
        
        {/* Left Column: Context & Bio info (Moved for better flow) */}
        <section className="lg:col-span-4 space-y-8 order-2 lg:order-1">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest">Medical Knowledge Base</h3>
            <div className="space-y-3">
              {infoSections.map((section, idx) => (
                <div 
                  key={idx}
                  className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-sm transition-all duration-300"
                >
                  <button
                    onClick={() => toggleAccordion(idx)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-700/30 transition-colors"
                  >
                    <span className="font-semibold text-slate-300 text-sm">{section.title}</span>
                    <span className={`text-[10px] transform transition-transform duration-300 text-slate-500 ${activeAccordion === idx ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    activeAccordion === idx ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                  }`}>
                    <div className="px-5 pb-5 text-slate-400 leading-relaxed border-t border-slate-800 pt-4 text-xs">
                      {section.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-indigo-600/10 border border-indigo-500/20 p-5 rounded-2xl">
            <h4 className="text-indigo-400 font-bold text-sm mb-2 flex items-center gap-2">
              <span>🔬</span> Research Abstract
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed italic">
              "Machine learning models trained on healthy functional connectivity can accurately predict task-evoked brain activation in schizophrenia patients, offering novel diagnostic pathways."
            </p>
          </div>
        </section>

        {/* Right Column: Main Analyzer */}
        <section className="lg:col-span-8 space-y-8 order-1 lg:order-2">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-6 leading-tight">
              Predictive <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Diagnosis</span> <br/> 
              at the speed of light.
            </h2>
            <p className="text-lg text-slate-400 leading-relaxed max-w-lg">
              Next-generation Schizophrenia screening using resting-state EEG connectivity patterns.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full"></div>
            
            <div className="relative space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Input Source
                  </label>
                  {file && (
                    <button 
                      onClick={() => setFile(null)}
                      className="text-[10px] text-rose-400 hover:text-rose-300 font-bold uppercase tracking-tighter"
                    >
                      Remove File
                    </button>
                  )}
                </div>
                
                <div className={`relative border-2 border-dashed rounded-3xl p-12 transition-all duration-500 flex flex-col items-center justify-center text-center gap-4 ${
                  file 
                  ? 'border-indigo-500/40 bg-indigo-500/5' 
                  : 'border-slate-700 hover:border-indigo-500/30 bg-slate-800/20'
                }`}>
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    accept=".edf"
                  />
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl transition-all duration-500 ${
                    file ? 'bg-indigo-600 text-white scale-110' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {file ? '📄' : '📤'}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-200">
                      {file ? file.name : "Select EEG Data File"}
                    </h4>
                    <p className="text-sm text-slate-500 mt-1 max-w-xs">
                      Drag and drop your .edf file here or click to browse local storage.
                    </p>
                  </div>
                </div>
              </div>

                <button
                  onClick={uploadFile}
                  disabled={loading || !file}
                  className={`w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-3 shadow-xl ${
                    loading || !file 
                    ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700' 
                    : 'bg-white text-slate-900 hover:bg-slate-100 hover:scale-[1.01] active:scale-[0.99]'
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-900/10 border-t-slate-900 rounded-full animate-spin"></div>
                      Analysing Data...
                    </>
                  ) : (
                    "Initialize Prediction"
                  )}
                </button>

              {/* Result Indicator */}
              {result && (
                <div className={`p-6 rounded-[2rem] border animate-in zoom-in-95 fade-in duration-500 ${
                  result.includes("Healthy") 
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : result.includes("Error")
                    ? "bg-amber-500/5 border-amber-500/20"
                    : "bg-rose-500/5 border-rose-500/20"
                }`}>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          result.includes("Healthy") ? "bg-emerald-500 shadow-[0_0_10px_#10b981]" : "bg-rose-500 shadow-[0_0_10px_#f43f5e]"
                        }`}></div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-50">Diagnostic Report</span>
                      </div>
                      <h3 className={`text-4xl font-black ${
                         result.includes("Healthy") ? "text-emerald-400" : "text-rose-400"
                      }`}>{result}</h3>
                    </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-12 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-8 text-slate-500">
        <div className="flex items-center gap-4 text-xs font-medium">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> System Ready</span>
          <span className="w-px h-4 bg-slate-800"></span>
          <span>v1.2.4-stable</span>
        </div>
        <p className="text-xs">NeuroScan AI &bull; Advanced EEG Analytics Dashboard</p>
        <div className="flex gap-4 grayscale opacity-40 hover:opacity-100 transition-opacity">
          <div className="h-6 w-12 bg-slate-700 rounded-sm"></div>
          <div className="h-6 w-12 bg-slate-700 rounded-sm"></div>
        </div>
      </footer>
    </div>
  );
}

export default App;
 