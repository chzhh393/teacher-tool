import { useState } from "react"
import { useNavigate } from "react-router-dom"

type Platform = "ios" | "android" | "pc"

interface Step {
  title: string
  desc: string
  image?: string
}

const iosSteps: Step[] = [
  {
    title: "用 Safari 打开本页面",
    desc: "必须使用 Safari 浏览器，微信/QQ 内置浏览器不支持安装",
  },
  {
    title: "点击底部「分享」按钮",
    desc: "Safari 底部工具栏中间的方形+箭头图标",
  },
  {
    title: "滑动找到「添加到主屏幕」",
    desc: "在弹出的分享菜单中向上滑动，找到并点击此选项",
  },
  {
    title: "点击右上角「添加」",
    desc: "确认名称后点击添加，桌面就会出现应用图标",
  },
]

const androidSteps: Step[] = [
  {
    title: "用 Chrome 浏览器打开本页面",
    desc: "推荐使用 Chrome，其他浏览器操作类似",
  },
  {
    title: "点击右上角「菜单」按钮",
    desc: "浏览器右上角的三个点图标",
  },
  {
    title: "选择「添加到主屏幕」或「安装应用」",
    desc: "不同浏览器可能显示为「添加到桌面」",
  },
  {
    title: "点击「安装」确认",
    desc: "确认后桌面就会出现应用图标，点击即可全屏使用",
  },
]

const pcSteps: Step[] = [
  {
    title: "用 Chrome 或 Edge 浏览器打开本页面",
    desc: "希沃一体机自带的浏览器也可以，或在电脑上打开 Chrome / Edge",
  },
  {
    title: "点击地址栏右侧的「安装」图标",
    desc: "地址栏最右边会出现一个「安装」按钮或带加号的图标，如下图所示",
    image: "/guide2.png",
  },
  {
    title: "在弹窗中点击「安装」",
    desc: "确认后应用会自动安装并打开独立窗口",
  },
  {
    title: "从桌面启动",
    desc: "安装完成后桌面会出现应用图标，双击即可打开，无需再开浏览器",
  },
]

const InstallGuide = () => {
  const [platform, setPlatform] = useState<Platform>("pc")
  const navigate = useNavigate()

  const steps = platform === "ios" ? iosSteps : platform === "android" ? androidSteps : pcSteps

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        {/* 返回按钮 */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-1 text-sm text-text-secondary hover:text-primary transition-colors"
        >
          <span className="text-lg leading-none">&larr;</span>
          <span>返回</span>
        </button>

        {/* 标题区 */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-3xl mb-4">
            +
          </div>
          <h1 className="text-xl font-bold text-text-primary">安装到桌面</h1>
          <p className="mt-2 text-sm text-text-secondary">
            像原生 App 一样使用，全屏体验更流畅
          </p>
        </div>

        {/* 平台切换 */}
        <div className="flex gap-1.5 rounded-xl bg-white p-1 shadow-sm mb-6">
          {([
            { key: "pc", label: "电脑 / 希沃" },
            { key: "ios", label: "iPhone / iPad" },
            { key: "android", label: "Android" },
          ] as const).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setPlatform(item.key)}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
                platform === item.key
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* 步骤列表 */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100"
            >
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-text-primary">{step.title}</h3>
                  <p className="mt-1 text-xs text-text-secondary leading-relaxed">{step.desc}</p>
                </div>
              </div>
              {step.image && (
                <img
                  src={step.image}
                  alt={step.title}
                  className="mt-3 w-full rounded-xl border border-gray-100"
                />
              )}
            </div>
          ))}
        </div>

        {/* 提示 */}
        <div className="mt-6 rounded-2xl bg-primary/5 border border-primary/10 p-4">
          <p className="text-xs text-text-secondary leading-relaxed">
            <span className="font-semibold text-primary">提示：</span>
            {platform === "ios"
              ? "微信或 QQ 中无法直接安装，请先点击右上角「...」选择「在 Safari 中打开」，然后再操作。"
              : platform === "android"
                ? "部分国产浏览器可能不支持此功能，建议使用 Chrome 浏览器。"
                : "希沃一体机可直接用自带浏览器操作。普通电脑推荐使用 Chrome 或 Edge，Safari 和 Firefox 暂不支持安装。"}
          </p>
        </div>

        {/* 安装后的好处 */}
        <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-text-primary mb-3">安装后你会获得</h3>
          <div className="space-y-2">
            {[
              "桌面快捷图标，一键打开",
              "全屏显示，没有浏览器地址栏",
              "加载更快，部分内容可离线使用",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-xs text-text-secondary">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default InstallGuide
