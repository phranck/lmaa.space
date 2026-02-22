export function HeroLogo() {
  return (
    <div className="flex flex-col items-center mb-1">
      <div
        role="img"
        aria-label="lmaa.space"
        style={{
          width: 140,
          height: 140,
          backgroundColor: "var(--accent-base)",
          maskImage: "url(/logo-white.png)",
          WebkitMaskImage: "url(/logo-white.png)",
          maskSize: "contain",
          WebkitMaskSize: "contain",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskPosition: "center",
        }}
      />
      <span
        className="text-4xl"
        style={{ color: "var(--accent-base)", fontFamily: "DynaPuff", fontWeight: 500 }}
      >
        LMAA
      </span>
    </div>
  );
}
