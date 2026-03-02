export function AboutHero() {
  return (
    <section className="bg-[#0f172a] py-24 text-white relative overflow-hidden text-center">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
      </div>
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <span className="text-blue-400 font-bold uppercase tracking-widest text-xs">Our Mission</span>
        <h1 className="text-5xl md:text-7xl font-black mt-2 mb-6">
          Forging Future <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#38bdf8] to-[#2563eb]">Innovators.</span>
        </h1>
        <p className="text-slate-400 text-xl max-w-2xl mx-auto leading-relaxed">
          Blaze Robotics Academy is more than a school; it&apos;s a launchpad for the next generation of engineers, thinkers, and leaders.
        </p>
      </div>
    </section>
  )
}
