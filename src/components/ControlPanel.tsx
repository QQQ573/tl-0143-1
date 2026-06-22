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
            <span className="text-xs text-slate-500 w-8 text-center">{gridSize}×{gridSize}</span>
            <button
              onClick={() => setGridSize(Math.min(8, gridSize + 1))}
              className="p-1 rounded hover:bg-slate-100 text-slate-600"
              title="增大网格"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
        <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
          {layers.map(layer => (
            <div
              key={layer.index}
              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                currentLayer === layer.index
                  ? 'bg-indigo-50 border border-indigo-200'
                  : 'hover:bg-slate-50 border border-transparent'
              }`}
              onClick={() => setCurrentLayer(layer.index)}
            >
              <span className="text-xs font-mono w-5 text-slate-500">L{layer.index}</span>
              <div className="flex-1">
                <div className="text-xs font-medium text-slate-700">
                  第 {layer.index + 1} 层
                  {!layer.visible && <span className="text-slate-400 ml-1">（已隐藏）</span>}
                </div>
                <div className="text-[10px] text-slate-400">
                  {beads.filter(b => b.layer === layer.index).length} 颗拼豆
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); toggleLayerVisibility(layer.index) }}
                className="p-1 rounded hover:bg-slate-200 text-slate-500"
                title={layer.visible ? '隐藏层（查看串珠通道）' : '显示层'}
              >
                {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              {layers.length > 1 && (
                <button
                  onClick={e => { e.stopPropagation(); removeLayer(layer.index) }}
                  className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-500"
                  title="删除层"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={addLayer}
          className="w-full mt-2 p-2 text-xs rounded-lg border border-dashed border-slate-300 text-slate-500 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all flex items-center justify-center gap-1"
        >
          <Plus size={14} /> 添加层
        </button>
      </div>

      <div className="p-4 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">色号选择</h2>
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(COLOR_PALETTE).map(([id, c]) => (
            <button
              key={id}
              onClick={() => setCurrentColor(id)}
              className={`group relative p-1 rounded-lg border-2 transition-all ${
                currentColor === id
                  ? 'border-indigo-500 shadow-md scale-105'
                  : 'border-transparent hover:border-slate-300'
              }`}
              title={`${id} ${c.name} (权重: ${c.weight})`}
            >
              <div
                className="w-full aspect-square rounded-md shadow-inner"
                style={{ backgroundColor: c.hex }}
              />
              <div className="text-[9px] text-center text-slate-500 mt-0.5 font-mono">{id}</div>
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
          className="grid gap-1 mx-auto"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            maxWidth: `${gridSize * 44}px`,
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
                  className={`relative aspect-square rounded-md border transition-all flex items-center justify-center ${
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
                  {isHanger && (
                    <CircleDot size={14} className="text-white drop-shadow" />
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
