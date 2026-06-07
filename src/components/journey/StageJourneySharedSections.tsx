"use client"

import type { CSSProperties } from "react"
import styles from "@/app/journey/stage-journey.module.css"

const AMILIA = "https://app.amilia.com/store/en/blazeroboticsacademy/shop/programs"

interface StageJourneySharedSectionsProps {
  condensedFont?: string
}

export function StageJourneyMembershipSection({ condensedFont }: StageJourneySharedSectionsProps) {
  const fontStyle: CSSProperties | undefined = condensedFont ? { fontFamily: condensedFont } : undefined

  return (
    <section className={`${styles.sec} ${styles.bgWhite}`} id="membership">
      <div className={styles.lbl} style={fontStyle}>
        Club Membership
      </div>
      <h2 className={styles.h2} style={fontStyle}>
        Afterschool Every Day.
        <br />
        Flexible for Every Family.
      </h2>
      <p className={styles.lead}>
        Our most flexible way to explore robotics — or add extra practice time on top of a course. No long-term commitment required.
      </p>
      <div className={styles.pgrid}>
        <div className={styles.pc}>
          <div className={styles.pcH}>
            <div className={styles.pcTier} style={fontStyle}>Drop-In</div>
            <div className={styles.pcName} style={fontStyle}>Single Session</div>
            <div className={styles.pcDesc}>Try once before committing</div>
            <div className={styles.pcPrice}>
              <div className={styles.pcCur} style={fontStyle}>$</div>
              <div className={styles.pcNum} style={fontStyle}>35</div>
              <div className={styles.pcPer} style={fontStyle}>/ Session</div>
            </div>
            <div className={styles.pcNote}>Any location · Any available day</div>
          </div>
          <div className={styles.pcDiv} />
          <ul className={styles.pcFeats}>
            <li>One afterschool session</li>
            <li>Open robot building time</li>
            <li>Coach supervision</li>
            <li>3D design station access</li>
            <li className={styles.pcFeatsLiDim}>Structured curriculum track</li>
          </ul>
          <div className={styles.pcFoot}>
            <a href={AMILIA} className={`${styles.btn} ${styles.btnGhost}`} target="_blank" rel="noopener noreferrer">
              Book a Drop-In
            </a>
          </div>
        </div>
        <div className={`${styles.pc} ${styles.pcFeat}`}>
          <div className={`${styles.pcH} ${styles.pcHFeat}`}>
            <div className={styles.pcTier} style={fontStyle}>Most Popular</div>
            <div className={styles.pcName} style={fontStyle}>Monthly Unlimited</div>
            <div className={styles.pcDesc}>Unlimited afterschool sessions</div>
            <div className={styles.pcPrice}>
              <div className={styles.pcCur} style={fontStyle}>$</div>
              <div className={styles.pcNum} style={fontStyle}>199</div>
              <div className={styles.pcPer} style={fontStyle}>/ Month</div>
            </div>
            <div className={styles.pcNote}>All 4 locations · Cancel anytime</div>
          </div>
          <div className={styles.pcDiv} />
          <ul className={styles.pcFeats}>
            <li>Unlimited afterschool sessions</li>
            <li>All 4 locations included</li>
            <li>Full structured curriculum</li>
            <li>Personalized coach feedback</li>
            <li>3D design &amp; printing unlimited</li>
          </ul>
          <div className={styles.pcFoot}>
            <a href={AMILIA} className={`${styles.btn} ${styles.btnBlue}`} target="_blank" rel="noopener noreferrer">
              Join Monthly
            </a>
          </div>
        </div>
        <div className={styles.pc}>
          <div className={styles.pcH}>
            <div className={styles.pcTier} style={fontStyle}>Bundle</div>
            <div className={styles.pcName} style={fontStyle}>Membership + Course</div>
            <div className={styles.pcDesc}>Maximum development</div>
            <div className={styles.pcPrice}>
              <div className={styles.pcCur} style={fontStyle}>$</div>
              <div className={styles.pcNum} style={fontStyle}>299</div>
              <div className={styles.pcPer} style={fontStyle}>/ Month</div>
            </div>
            <div className={styles.pcNote}>Membership + weekly course</div>
          </div>
          <div className={styles.pcDiv} />
          <ul className={styles.pcFeats}>
            <li>Everything in Monthly Unlimited</li>
            <li>One weekly structured course</li>
            <li>Progress tracking + parent reports</li>
            <li>Priority waitlist placement</li>
            <li>Fastest path to team eligibility</li>
          </ul>
          <div className={styles.pcFoot}>
            <a href={AMILIA} className={`${styles.btn} ${styles.btnGhost}`} target="_blank" rel="noopener noreferrer">
              Go Full Immersion
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

export function StageJourneyVexSection({ condensedFont }: StageJourneySharedSectionsProps) {
  const fontStyle: CSSProperties | undefined = condensedFont ? { fontFamily: condensedFont } : undefined

  return (
    <section className={`${styles.sec} ${styles.bgOff}`}>
      <div className={styles.vg}>
        <div>
          <div className={styles.lbl} style={fontStyle}>
            What Is VEX?
          </div>
          <h2 className={styles.h2} style={fontStyle}>
            Real Engineering.
            <br />
            Real Competition.
          </h2>
          <p className={styles.lead}>
            VEX Robotics is the world&apos;s largest robotics program for students. Teams design, build, and program robots to complete game-based challenges. Blaze trains the students who go on to love it — and win it.
          </p>
          <div className={styles.vfacts}>
            <div className={styles.vf}>
              <div className={styles.vfn} style={fontStyle}>
                2M<span style={{ color: "var(--red)" }}>+</span>
              </div>
              <div className={styles.vfl}>Students in VEX worldwide</div>
            </div>
            <div className={styles.vf}>
              <div className={styles.vfn} style={fontStyle}>
                50<span style={{ color: "var(--red)" }}>+</span>
              </div>
              <div className={styles.vfl}>Countries at VEX Worlds</div>
            </div>
            <div className={styles.vf}>
              <div className={styles.vfn} style={fontStyle}>K–12</div>
              <div className={styles.vfl}>Programs for every age</div>
            </div>
            <div className={styles.vf}>
              <div className={styles.vfn} style={fontStyle}>STEM</div>
              <div className={styles.vfl}>Math, physics, code, design</div>
            </div>
          </div>
        </div>
        <div className={styles.vsteps}>
          {[
            { n: "01", h: "Design Your Robot", d: "Plan and engineer a robot for a specific challenge. Real CAD tools, real trade-offs." },
            { n: "02", h: "Build & Program It", d: "Assemble the robot and write the code — motors, sensors, autonomous routines." },
            { n: "03", h: "Test & Iterate", d: "Nothing works perfectly first time. Testing, breaking, rebuilding — that's where real learning happens." },
            { n: "04", h: "Apply What You Built", d: "Take your skills to the competition floor, into a community project, or just keep building." },
          ].map((step) => (
            <div key={step.n} className={styles.vs}>
              <div className={styles.vsn} style={fontStyle}>{step.n}</div>
              <div>
                <div className={styles.vsh} style={fontStyle}>{step.h}</div>
                <div className={styles.vsd}>{step.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function StageJourneyCtaSection({ condensedFont }: StageJourneySharedSectionsProps) {
  const fontStyle: CSSProperties | undefined = condensedFont ? { fontFamily: condensedFont } : undefined

  return (
    <section className={`${styles.sec} ${styles.bgWhite}`}>
      <div className={styles.ctaBanner}>
        <h2 className={styles.ctaTitle} style={fontStyle}>
          Take the First Step.
        </h2>
        <p className={styles.ctaSub}>
          Book a free trial — 45 minutes, all equipment provided, zero pressure.
        </p>
        <div className={styles.ctaActs}>
          <a href={AMILIA} className={`${styles.btn} ${styles.btnRed} ${styles.btnLg}`} target="_blank" rel="noopener noreferrer">
            Book a Free Trial
          </a>
          <a href="tel:4256108618" className={`${styles.btn} ${styles.btnOutW} ${styles.btnLg}`}>
            Call 425-610-8618
          </a>
        </div>
      </div>
    </section>
  )
}
