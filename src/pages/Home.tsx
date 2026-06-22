import SceneCanvas from '@/components/SceneCanvas'
import ControlPanel from '@/components/ControlPanel'

export default function Home() {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <div className="flex-1 relative">
        <SceneCanvas />
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow text-xs text-slate-600 border border-slate-200">
          <div className="font-semibold text-slate-800 mb-1">操作提示</div>
          <div>🖱️ 左键拖拽旋转视角</div>
          <div>🔍 滚轮 / 双指捏合缩放</div>
          <div>📱 移动端双指支持</div>
        </div>
      </div>
      <div className="w-80 flex-shrink-0 hidden md:block">
        <ControlPanel />
      </div>
      <div className="md:hidden">
        <ControlPanel />
      </div>
    </div>
  )
}
