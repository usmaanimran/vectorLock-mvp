import React from 'react';
import { optimizeDispatch, ManifestItem } from '@/lib/optimizationPipeline';
import { Truck, Package, List, Trash2 } from 'lucide-react';

export function QueueMonitor({
  manifest,
  setManifest,
  setOptimizedRoutes,
  activeWaypoints,
  overflowQueue
}: {
  manifest: ManifestItem[],
  setManifest: (m: ManifestItem[]) => void,
  setOptimizedRoutes: (r: ManifestItem[][]) => void,
  activeWaypoints: ManifestItem[],
  overflowQueue: ManifestItem[][]
}) {
  const filteredActive = activeWaypoints.filter(item => !item.name.toLowerCase().includes('base') && !item.name.toLowerCase().includes('return'));
  const filteredQueue = overflowQueue.flat().filter(item => !item.name.toLowerCase().includes('base') && !item.name.toLowerCase().includes('return'));

  return (
    <div className="absolute top-4 right-4 z-10 w-80 bg-neutral-900/80 backdrop-blur-2xl border border-neutral-800 text-neutral-100 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
      <div className="p-5 flex flex-col gap-6 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        
        {/* DRAFT MANIFEST (Ready to Dispatch) */}
        {manifest.length > 0 && (
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
              <List className="w-4 h-4" /> Draft Dropoff ({manifest.length})
            </h4>
            <div className="flex flex-col gap-2">
              {manifest.map((item, idx) => (
                <div key={`manifest-${idx}`} className="bg-neutral-800/60 border border-neutral-700/60 rounded-xl px-4 py-3 flex justify-between items-center text-xs group transition-all hover:border-neutral-600 shadow-sm">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-sm text-neutral-100">{item.name}</span>
                    <span className="font-mono text-xs text-neutral-400 bg-neutral-950 px-2 py-0.5 rounded-md w-fit">[{item.target.row}, {item.target.col}]</span>
                    <div className="text-xs text-neutral-500 font-mono mt-0.5">
                      {item.weight}kg | {item.volume}m³
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const newManifest = manifest.filter((_, i) => i !== idx);
                      setManifest(newManifest);
                      const bases = [{ row: 0, col: 0 }, { row: 0, col: 0 }, { row: 0, col: 0 }];
                      setOptimizedRoutes(optimizeDispatch(newManifest, bases));
                    }}
                    className="text-neutral-500 hover:text-red-400 transition-colors p-2 bg-neutral-900 hover:bg-neutral-800 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ONGOING TRIPS */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
            <Truck className="w-4 h-4" /> Ongoing Trips ({filteredActive.length})
          </h4>
          
          {filteredActive.length > 0 ? (
            <div className="flex flex-col gap-2">
              {filteredActive.map((item, idx) => (
                <div key={`active-${idx}`} className="bg-neutral-800/60 border border-neutral-700/60 rounded-xl px-4 py-3 flex flex-col gap-1 transition-all shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm text-neutral-100">{item.name}</span>
                    <span className="font-mono text-xs text-neutral-400 bg-neutral-950 px-2 py-0.5 rounded-md">[{item.target.row}, {item.target.col}]</span>
                  </div>
                  <div className="text-xs text-neutral-400 font-mono mt-1">
                    {item.weight}kg | {item.volume}m³
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-neutral-500 italic px-3 py-6 text-center bg-neutral-800/30 border border-neutral-800/50 rounded-xl">No active dispatches</div>
          )}
        </div>

        {/* UP NEXT (QUEUED) */}
        {filteredQueue.length > 0 && (
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-2 mt-2">
              <Package className="w-4 h-4" /> Up Next (Queued) ({filteredQueue.length})
            </h4>
            <div className="flex flex-col gap-2">
              {filteredQueue.map((item, idx) => (
                <div key={`queued-${idx}`} className="bg-neutral-800/30 border border-neutral-800/80 rounded-xl px-4 py-3 flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm text-neutral-300">{item.name}</span>
                    <span className="font-mono text-xs text-neutral-500">[{item.target.row}, {item.target.col}]</span>
                  </div>
                  <div className="text-xs text-neutral-500 font-mono mt-1">
                    {item.weight}kg | {item.volume}m³
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}