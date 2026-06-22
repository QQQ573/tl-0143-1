import {
  COLOR_PALETTE,
  BASE_DIMENSIONS,
  useBeadStore,
  type BaseType,
} from '@/store/beadStore'
import { Eye, EyeOff, Plus, Minus, Trash2, CircleDot } from 'lucide-react'

export default function ControlPanel() {
  const {
    layers,
    gridSize,
    currentLayer,
    currentColor,
    baseType,
    beads,
    hangerPositions,
    addLayer,
    removeLayer,
    toggleLayerVisibility,
    setCurrentLayer,
    setCurrentColor,
    setGridSize,
    setBaseType,
    placeBead,
    removeBead,
    toggleHanger,
    clearAll,
    calculateCenterOfGravity,
  } = useBeadStore()

  const cog = calculateCenterOfGravity()

  const handleCellClick = (row: number, col: number, e: React.MouseEvent) => {
    if (e.shiftKey) {
      toggleHanger(currentLayer, row, col)
    } else if (e.button === 2 || e.ctrlKey) {
      removeBead(currentLayer, row, col)
    } else {
      placeBead(currentLayer, row, col)
    }
  }

  const handleCellRightClick = (row: number, col: number, e: React.MouseEvent) => {
    e.preventDefault()
    removeBead(currentLayer, row, col)
  }

  const layerBeadIds = new Set(
    beads.filter(b => b.layer === currentLayer).map(b => b.id),
  )
  const layerBeads = beads.filter(b => b.layer === currentLayer)
  const warningSet = new Set(
    cog.warningCells.filter(c => c.layer === currentLayer).map(c => `b-${c.layer}-${c.row}-${c.col}`),
  )

  const baseOptions: { value: BaseType; label: string }[] = [
    { value: 'keychain', label: '🔑 钥匙扣' },
    { value: 'ornament', label: '🏠 摆件' },
    { value: 'phonestand', label: '📱 手机支架' },
  ]

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200 overflow-y-auto">
      <div className="p-4 border-b border-slate-200">
        <h1 className="text-lg font-bold text-slate-800 mb-1">拼豆立体预览</h1>
        <p className="text-xs text-slate-500">Three.js r160 · 重心实时检测</p>
      </div>

      <div className="p-4 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">重心状态</h2>
        <div className={`p-3 rounded-lg ${cog.withinBase ? 'bg-emerald-50 border border-emerald-200' : 'bg-orange-50 border border-orange-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${cog.withinBase ? 'bg-emerald-500' : 'bg-orange-500 animate-pulse'}`} />
            <span className={`text-sm font-medium ${cog.withinBase ? 'text-emerald-700' : 'text-orange-700'}`}>
              {cog.withinBase ? '重心稳定' : '⚠️ 重心偏移，晾干后可能前倾'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-slate-600">投影 X: {cog.projectedX.toFixed(2)}</div>
            <div className="text-slate-600">投影 Z: {cog.projectedZ.toFixed(2)}</div>
            <div className="text-slate-600">重心高: {cog.y.toFixed(2)}</div>
            <div className="text-slate-600">超出比: {(cog.overhangRatio * 100).toFixed(0)}%</div>
          </div>
          {!cog.withinBase && (
            <p className="text-xs text-orange-700 mt-2">
              💡 橙色格子为风险拼豆，建议将重色块下移到底层
            </p>
          )}
        </div>
      </div>

      <div className="p-4 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">底座类型</h2>
        <div className="grid grid-cols-3 gap-2">
          {baseOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setBaseType(opt.value)}
              className={`p-2 text-xs rounded-lg border transition-all ${
                baseType === opt.value
                  ? 'bg-indigo-500 text-white border-indigo-500 shadow'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          尺寸: {BASE_DIMENSIONS[baseType].width}×{BASE_DIMENSIONS[baseType].depth}×{BASE_DIMENSIONS[baseType].height}
        </p>
      </div>

      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">层管理</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setGridSize(Math.max(3, gridSize - 1))}
              className="p-1 rounded hover:bg-slate-100 text-slate-600"
              title="减小网格"
            >
              <Minus size={14} />
            </button>
            <span className="text-xs text-slate-500 w-10 text-center font-mono">{gridSize}×{gridSize}</span>
            <button
              onClick={() => setGridSize(Math.min(12, gridSize + 1))}
              className="p-1 rounded hover:bg-slate-100 text-slate-600"
              title="增大网格"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
        <div className="mb-3">
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
            <span>底层</span>
            <span>↑ 高度 ↑</span>
            <span>顶层</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-indigo-100 via-purple-200 to-pink-300" />
        </div>
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {layers.sort((a, b) => b.index - a.index).map(layer => {
            const maxLayer = Math.max(...layers.map(l => l.index), 1)
            const heightRatio = layer.index / maxLayer
            const layerColor = `hsl(${250 - heightRatio * 80}, ${70 + heightRatio * 10}%, ${65 - heightRatio * 15}%)`
            const layerBeads = beads.filter(b => b.layer === layer.index)
            const warningInLayer = cog.warningCells.filter(c => c.layer === layer.index).length
            const previewSize = Math.min(gridSize, 6)
            const previewScale = previewSize / gridSize
            return (
              <div
                key={layer.index}
                className={`relative flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                  currentLayer === layer.index
                    ? 'bg-indigo-50 border-2 border-indigo-300 shadow-sm'
                    : 'hover:bg-slate-50 border-2 border-transparent'
                }`}
                onClick={() => setCurrentLayer(layer.index)}
              >
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                  style={{ backgroundColor: layerColor, opacity: layer.visible ? 1 : 0.3 }}
                />
                <div className="ml-1 flex items-center gap-2 flex-1 min-w-0">
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-mono font-bold text-slate-700" style={{ color: layer.visible ? layerColor : '#94a3b8' }}>
                      L{layer.index}
                    </span>
                    <span className="text-[8px] text-slate-400">
                      {(layer.index * 1.05).toFixed(1)}u
                    </span>
                  </div>

                  <div
                    className="grid gap-px p-1 bg-slate-200 rounded"
                    style={{
                      gridTemplateColumns: `repeat(${previewSize}, minmax(0, 1fr))`,
                      width: `${previewSize * 6}px`,
                      opacity: layer.visible ? 1 : 0.4,
                    }}
                  >
                    {Array.from({ length: previewSize }).map((_, pr) =>
                      Array.from({ length: previewSize }).map((_, pc) => {
                        const r = Math.floor(pr / previewScale)
                        const c = Math.floor(pc / previewScale)
                        const bead = layerBeads.find(b => b.row === r && b.col === c)
                        const color = bead ? COLOR_PALETTE[bead.colorId] : null
                        return (
                          <div
                            key={`${pr}-${pc}`}
                            className="w-1 h-1 rounded-sm"
                            style={{
                              backgroundColor: color?.hex || (warningInLayer > 0 && (r === 0 || r === gridSize - 1 || c === 0 || c === gridSize - 1) ? '#ff880020' : '#e2e8f0'),
                            }}
                          />
                        )
                      }),
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-700 flex items-center gap-1">
                      第 {layer.index + 1} 层
                      {warningInLayer > 0 && (
                        <span className="px-1 py-0.5 bg-orange-100 text-orange-600 text-[8px] rounded font-semibold">
                          ⚠{warningInLayer}
                        </span>
                      )}
                      {!layer.visible && <span className="text-slate-400 text-[10px]">（已隐藏）</span>}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: layerColor }} />
                      {layerBeads.length} 颗 · {layerBeads.reduce((s, b) => s + (COLOR_PALETTE[b.colorId]?.weight || 1), 0).toFixed(1)}g
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-0.5">
                  <button
                    onClick={e => { e.stopPropagation(); toggleLayerVisibility(layer.index) }}
                    className={`p-1 rounded hover:bg-slate-200 ${layer.visible ? 'text-slate-500' : 'text-indigo-400'}`}
                    title={layer.visible ? '隐藏层（查看串珠通道）' : '显示层'}
                  >
                    {layer.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                  </button>
                  {layers.length > 1 && (
                    <button
                      onClick={e => { e.stopPropagation(); removeLayer(layer.index) }}
                      className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-500"
                      title="删除层"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <button
          onClick={addLayer}
          className="w-full mt-2 p-2 text-xs rounded-lg border border-dashed border-slate-300 text-slate-500 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all flex items-center justify-center gap-1"
        >
          <Plus size={14} /> 添加层
        </button>
      </div>

      <div className="p-4 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">色号选择 · 24 色</h2>
        <div className="grid grid-cols-6 gap-1.5">
          {Object.entries(COLOR_PALETTE).map(([id, c]) => (
            <button
              key={id}
              onClick={() => setCurrentColor(id)}
              className={`group relative p-1 rounded-md border-2 transition-all ${
                currentColor === id
                  ? 'border-indigo-500 shadow-md scale-105'
                  : 'border-transparent hover:border-slate-300'
              }`}
              title={`${id} ${c.name} (权重: ${c.weight})`}
            >
              <div
                className="w-full aspect-square rounded shadow-inner"
                style={{ backgroundColor: c.hex }}
              />
              <div className="text-[8px] text-center text-slate-500 mt-0.5 font-mono">{id}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 border-b border-slate-200 flex-1">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">
            网格编辑 - L{currentLayer}
          </h2>
          <button
            onClick={clearAll}
            className="text-xs text-red-500 hover:text-red-600 hover:underline"
          >
            清空全部
          </button>
        </div>
        <div className="text-[10px] text-slate-400 mb-2">
          左键放置 · 右键/ctrl+左键删除 · shift+左键设为挂点
        </div>
        <div
          className="grid gap-0.5 mx-auto"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            maxWidth: `${gridSize * Math.max(22, 44 - gridSize * 2)}px`,
          }}
        >
          {Array.from({ length: gridSize }).map((_, row) =>
            Array.from({ length: gridSize }).map((_, col) => {
              const bead = layerBeads.find(b => b.row === row && b.col === col)
              const color = bead ? COLOR_PALETTE[bead.colorId] : null
              const isHanger = bead && hangerPositions.includes(bead.id)
              const isWarning = bead && warningSet.has(bead.id)
              return (
                <button
                  key={`${row}-${col}`}
                  onClick={e => handleCellClick(row, col, e)}
                  onContextMenu={e => handleCellRightClick(row, col, e)}
                  className={`relative aspect-square rounded border transition-all flex items-center justify-center ${
                    isWarning
                      ? 'border-orange-400 ring-2 ring-orange-300 animate-pulse'
                      : bead
                        ? 'border-slate-400'
                        : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                  }`}
                  style={{
                    backgroundColor: isWarning ? '#ff8800' : (color?.hex || '#fafafa'),
                  }}
                  title={`R${row} C${col}${bead ? ` · ${bead.colorId}` : ''}`}
                >
                  {isHanger && gridSize <= 8 && (
                    <CircleDot size={Math.max(8, 14 - gridSize)} className="text-white drop-shadow" />
                  )}
                </button>
              )
            }),
          )}
        </div>
        {layerBeadIds.size === 0 && (
          <p className="text-xs text-slate-400 text-center mt-3">当前层为空</p>
        )}
      </div>

      <div className="p-3 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-400">
        <div>🖱️ 拖拽旋转 · 滚轮缩放 · 双指移动端操作</div>
        <div>👁️ 隐藏层可查看内部串珠通道</div>
      </div>
    </div>
  )
}
