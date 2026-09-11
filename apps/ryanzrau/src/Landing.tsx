import { css } from "goober";

/**
 * The public, signed-out home page. Deliberately outside the bluestar
 * design system (see CLAUDE.md's carve-out for this page) — bluestar is
 * tuned for dashboard UI, and this is a personal/marketing page that wants
 * its own warm, "nature journal" feel instead of the app shell.
 */

const palette = {
  paper: "#f6f0e2",
  card: "#fbf6ea",
  border: "#cbb98f",
  borderStrong: "#a8926a",
  dot: "#e4d7ba",
  dogEar: "#e9dcc0",
  ink: "#3a3126",
  muted: "#5a4f3f",
  mutedLight: "#6b5f4f",
  clay: "#b6603c",
  clayDark: "#8f4a2d",
  moss: "#4b5d3a",
  mustard: "#c98a2c",
};

const pageClass = css`
  min-height: 100vh;
  background-color: ${palette.paper};
  background-image: radial-gradient(${palette.dot} 0.7px, transparent 0.7px);
  background-size: 14px 14px;
  color: ${palette.ink};
  font-family:
    "Karla",
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  line-height: 1.6;
`;

const shellClass = css`
  max-width: 1040px;
  margin: 0 auto;
  padding: 32px 24px 100px;
  @media (max-width: 640px) {
    padding: 24px 18px 72px;
  }
`;

const topBarClass = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0 48px;
`;

const wordmarkClass = css`
  font-family: "Bitter", Georgia, serif;
  font-size: 20px;
  font-weight: 600;
`;

const signInButtonClass = css`
  appearance: none;
  border: 1.5px dashed ${palette.border};
  background: ${palette.card};
  color: ${palette.ink};
  font-family: "Karla", sans-serif;
  font-size: 14px;
  font-weight: 500;
  padding: 8px 20px;
  border-radius: 999px;
  cursor: pointer;
  transition: border-color 0.15s ease;
  &:hover {
    border-color: ${palette.clay};
  }
`;

const heroClass = css`
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  gap: 48px;
  align-items: center;
  padding: 24px 0 64px;
  @media (max-width: 860px) {
    grid-template-columns: 1fr;
    padding-top: 8px;
  }
`;

const heroTextClass = css`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const eyebrowClass = css`
  font-family: "Caveat", cursive;
  font-size: 26px;
  color: ${palette.clay};
  transform: rotate(-2deg);
  margin-bottom: -6px;
`;

const h1Class = css`
  font-family: "Bitter", Georgia, serif;
  font-size: 50px;
  font-weight: 600;
  line-height: 1.12;
  margin: 0;
  @media (max-width: 640px) {
    font-size: 34px;
  }
`;

const leadClass = css`
  font-size: 18px;
  color: ${palette.muted};
  margin: 0;
  max-width: 480px;
`;

const ctaRowClass = css`
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 8px;
`;

const ctaPrimaryClass = css`
  display: inline-flex;
  align-items: center;
  gap: 9px;
  background: ${palette.clay};
  color: ${palette.card};
  text-decoration: none;
  font-family: "Karla", sans-serif;
  font-size: 15px;
  font-weight: 600;
  padding: 13px 24px;
  border-radius: 8px;
  transition: background 0.15s ease;
  &:hover {
    background: ${palette.clayDark};
  }
`;

const ctaSecondaryClass = css`
  display: inline-flex;
  align-items: center;
  gap: 9px;
  background: transparent;
  color: ${palette.ink};
  border: 1.5px dashed ${palette.border};
  text-decoration: none;
  font-family: "Karla", sans-serif;
  font-size: 15px;
  font-weight: 600;
  padding: 13px 24px;
  border-radius: 8px;
  transition: border-color 0.15s ease;
  &:hover {
    border-color: ${palette.clay};
  }
`;

const heroImageWrapClass = css`
  position: relative;
  width: 100%;
  height: 400px;
  border-radius: 14px;
  overflow: hidden;
  border: 5px solid ${palette.card};
  box-shadow: 0 10px 26px rgba(74, 58, 38, 0.18);
  transform: rotate(1.4deg);
  @media (max-width: 860px) {
    height: 260px;
    transform: rotate(0.6deg);
  }
`;

const heroCaptionClass = css`
  position: absolute;
  bottom: 14px;
  right: 16px;
  font-family: "Caveat", cursive;
  font-size: 20px;
  color: ${palette.card};
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
`;

const sectionClass = css`
  padding: 36px 0;
`;

const sectionHeadClass = css`
  font-family: "Bitter", Georgia, serif;
  font-size: 16px;
  font-weight: 600;
  color: ${palette.moss};
  margin: 0 0 24px;
`;

const sectionHeadIconClass = css`
  display: flex;
  align-items: center;
  gap: 9px;
`;

const bodyTextClass = css`
  font-size: 17px;
  color: ${palette.muted};
  max-width: 660px;
  margin: 0;
`;

const timelineClass = css`
  display: flex;
  flex-direction: column;
  gap: 34px;
`;

const tlRowClass = css`
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 26px;
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 6px;
  }
`;

const tlDateClass = css`
  font-size: 13px;
  color: ${palette.mutedLight};
  padding-top: 3px;
`;

const tlItemClass = css`
  position: relative;
  padding-left: 22px;
  border-left: 2px solid ${palette.border};
  &::before {
    content: "";
    position: absolute;
    left: -7px;
    top: 4px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: ${palette.mustard};
    border: 2px solid ${palette.paper};
  }
`;

const roleClass = css`
  font-family: "Bitter", Georgia, serif;
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 4px;
`;

const orgClass = css`
  font-size: 14px;
  color: ${palette.clay};
  font-weight: 600;
  margin: 0 0 10px;
`;

const descClass = css`
  font-size: 15px;
  color: ${palette.muted};
  margin: 0;
  max-width: 560px;
`;

const chipRowClass = css`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const leafChipClass = css`
  font-family: "Karla", sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: ${palette.ink};
  background: ${palette.card};
  border: 1.5px dashed ${palette.border};
  padding: 9px 16px 9px 12px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
`;

const tagGridClass = css`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
  @media (max-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 420px) {
    grid-template-columns: 1fr;
  }
`;

const tagCardClass = css`
  background: ${palette.card};
  border: 1.5px solid ${palette.border};
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
  padding: 26px 12px 20px;
  position: relative;
  &::before {
    content: "";
    position: absolute;
    top: 11px;
    left: 13px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 1.5px solid ${palette.borderStrong};
    background: ${palette.paper};
  }
  &::after {
    content: "";
    position: absolute;
    top: -1px;
    right: -1px;
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 0 16px 16px 0;
    border-color: transparent ${palette.dogEar} transparent transparent;
  }
`;

const tagLabelClass = css`
  font-family: "Caveat", cursive;
  font-size: 20px;
  color: ${palette.ink};
`;

const tagSubClass = css`
  font-size: 13px;
  color: ${palette.mutedLight};
  margin-top: -6px;
`;

const footerClass = css`
  padding-top: 44px;
  border-top: 1.5px dashed ${palette.border};
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const footerLinksClass = css`
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  font-size: 15px;
  font-weight: 500;
  a {
    display: flex;
    align-items: center;
    gap: 8px;
    color: ${palette.clay};
    text-decoration: none;
  }
  a:hover {
    color: ${palette.clayDark};
    text-decoration: underline;
  }
`;

const footerNoteClass = css`
  font-size: 13px;
  color: ${palette.mutedLight};
`;

const footerSignInClass = css`
  background: none;
  border: none;
  padding: 0;
  color: ${palette.clay};
  cursor: pointer;
  font-size: 13px;
  text-decoration: underline;
  font-family: inherit;
`;

const experience = [
  {
    date: "2022 — Present",
    role: "Senior Software Engineer",
    org: "Affirma Consulting, contracted to Meta",
    desc: "Currently on a Data Center team, productionizing prototype apps and building new internal tools fast with AI-assisted development. Before that, spent three years building an internal asset-management platform from scratch that grew to serve nearly 100 teams and tens of thousands of assets.",
  },
  {
    date: "2019 — 2022",
    role: "Software Engineer & Intern",
    org: "Affirma Consulting",
    desc: "Built an IoT energy-dashboard product in Angular for a client and shipped demos for the Microsoft Graph API. Stuck around post-internship for database migrations and reporting scripts before landing on the Meta contract.",
  },
  {
    date: "2017 — 2021",
    role: "Technology Coordinator",
    org: "University of Arkansas, STEM Education",
    desc: "Built a Django inventory system to replace a paper-and-sticky-notes process for 800+ pieces of loaned equipment — later presented it at a national UTeach conference.",
  },
];

const skills = [
  "TypeScript",
  "React",
  "PHP",
  "Python",
  "C#",
  "C++",
  "GraphQL",
  "SQL",
  "Angular",
  "React Native",
  "Django",
  "AI-agent tooling",
];

const projects = [
  {
    rotate: "-1.5deg",
    label: "Stash",
    sub: "Household inventory, shared with family",
    icon: (
      <path
        d="M4 8l8-4 8 4-8 4-8-4zM4 8v8l8 4 8-4V8M12 12v8"
        stroke="#b6603c"
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="none"
      />
    ),
  },
  {
    rotate: "1deg",
    label: "Tony",
    sub: "Home-lab LLM dashboard",
    icon: (
      <>
        <rect
          x="7"
          y="7"
          width="10"
          height="10"
          rx="1.5"
          stroke="#b6603c"
          strokeWidth="1.6"
          fill="none"
        />
        <path
          d="M9.5 7V4M14.5 7V4M9.5 20v-3M14.5 20v-3M7 9.5H4M7 14.5H4M20 9.5h-3M20 14.5h-3"
          stroke="#b6603c"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
      </>
    ),
  },
  {
    rotate: "-1deg",
    label: "Bluestar",
    sub: "The component library this site runs on",
    icon: (
      <path
        d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2L12 3z"
        stroke="#b6603c"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
    ),
  },
];

const hobbies = [
  {
    rotate: "-2deg",
    label: "Gravel biking",
    icon: (
      <>
        <circle cx="5.5" cy="17.5" r="3.6" stroke="#b6603c" strokeWidth="1.7" fill="none" />
        <circle cx="18.5" cy="17.5" r="3.6" stroke="#b6603c" strokeWidth="1.7" fill="none" />
        <path
          d="M5.5 17.5L10 8h3.5l-1.4 3M18.5 17.5L13 9M13 9l2.2 3.2h3.3"
          stroke="#b6603c"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </>
    ),
  },
  {
    rotate: "1.5deg",
    label: "Running",
    icon: (
      <>
        <circle cx="14.5" cy="5" r="2" stroke="#b6603c" strokeWidth="1.7" fill="none" />
        <path
          d="M9 20l3-5-2-4 3-3 2.2 3 4-1M12 11l3 3 3-1"
          stroke="#b6603c"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </>
    ),
  },
  {
    rotate: "-1deg",
    label: "Climbing",
    icon: (
      <path
        d="M3 19l6-11 3 5 2-3 7 9H3z"
        stroke="#b6603c"
        strokeWidth="1.7"
        strokeLinejoin="round"
        fill="none"
      />
    ),
  },
  {
    rotate: "2deg",
    label: "Photography",
    icon: (
      <>
        <rect
          x="3"
          y="7"
          width="18"
          height="13"
          rx="2"
          stroke="#b6603c"
          strokeWidth="1.7"
          fill="none"
        />
        <circle cx="12" cy="13.5" r="3.5" stroke="#b6603c" strokeWidth="1.7" fill="none" />
      </>
    ),
  },
  {
    rotate: "-1.5deg",
    label: "My golden retriever",
    icon: (
      <>
        <path
          d="M7 10c-1.5-2-1-5 1-5.5 1 .5 1.5 1.5 1.5 2.5M17 10c1.5-2 1-5-1-5.5-1 .5-1.5 1.5-1.5 2.5"
          stroke="#b6603c"
          strokeWidth="1.7"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M6 12c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5-2.7 6.5-6 6.5-6-3.2-6-6.5z"
          stroke="#b6603c"
          strokeWidth="1.7"
          fill="none"
        />
        <circle cx="9.7" cy="12" r=".6" fill="#b6603c" />
        <circle cx="14.3" cy="12" r=".6" fill="#b6603c" />
        <path
          d="M10.5 15c.5.5 2.5.5 3 0"
          stroke="#b6603c"
          strokeWidth="1.7"
          strokeLinecap="round"
          fill="none"
        />
      </>
    ),
  },
  {
    rotate: "1deg",
    label: "Plants",
    icon: (
      <>
        <path d="M12 21v-9" stroke="#b6603c" strokeWidth="1.7" strokeLinecap="round" fill="none" />
        <path
          d="M12 12c0-3 2-5 5-5 0 3-2 5-5 5z"
          stroke="#b6603c"
          strokeWidth="1.7"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M12 15.3c0-2.5-1.8-4.2-4.5-4.2 0 2.5 1.8 4.2 4.5 4.2z"
          stroke="#b6603c"
          strokeWidth="1.7"
          strokeLinejoin="round"
          fill="none"
        />
      </>
    ),
  },
];

export function Landing({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className={pageClass}>
      <div className={shellClass}>
        <div className={topBarClass}>
          <span className={wordmarkClass}>Ryan Rau</span>
          <button className={signInButtonClass} onClick={onSignIn}>
            Sign in
          </button>
        </div>

        <div className={heroClass}>
          <div className={heroTextClass}>
            <div className={eyebrowClass}>Fayetteville, Arkansas —</div>
            <h1 className={h1Class}>Software engineer &amp; reverse&#8209;engineer at heart.</h1>
            <p className={leadClass}>
              I like taking things apart to understand how they work, then building something better
              with what I learn. These days that means leading internal tools at Meta by day — and
              chasing gravel roads, climbing routes, and good light by everything else.
            </p>
            <div className={ctaRowClass}>
              <a className={ctaPrimaryClass} href="mailto:ryanzrau@gmail.com">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <rect
                    x="3"
                    y="5.5"
                    width="18"
                    height="13"
                    rx="2"
                    stroke="#fbf6ea"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M4 7l8 6 8-6"
                    stroke="#fbf6ea"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Say hello
              </a>
              <a
                className={ctaSecondaryClass}
                href="https://github.com/RyanRau"
                target="_blank"
                rel="noreferrer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 8l-4 4 4 4M15 8l4 4-4 4"
                    stroke="#3a3126"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                GitHub
              </a>
            </div>
          </div>

          <div className={heroImageWrapClass}>
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 480 400"
              preserveAspectRatio="xMidYMid slice"
            >
              <rect width="480" height="400" fill="#dfe6c9" />
              <path
                d="M0 260 L90 150 L160 230 L230 110 L300 240 L360 160 L480 260 L480 400 L0 400 Z"
                fill="#a9b98a"
              />
              <path
                d="M0 320 L110 240 L210 300 L320 220 L420 300 L480 260 L480 400 L0 400 Z"
                fill="#7d9163"
              />
              <path d="M180 400 C 200 300, 230 260, 240 400 Z" fill="#e7ddc0" />
              <path d="M0 400 C 120 380, 360 380, 480 400 Z" fill="#cdbf98" />
              <circle cx="380" cy="80" r="34" fill="#eec36b" />
            </svg>
            <div className={heroCaptionClass}>weekend miles</div>
          </div>
        </div>

        <div className={sectionClass}>
          <h2 className={`${sectionHeadClass} ${sectionHeadIconClass}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 21v-9" stroke="#4b5d3a" strokeWidth="1.8" strokeLinecap="round" />
              <path
                d="M12 12c0-3 2-5 5-5 0 3-2 5-5 5z"
                stroke="#4b5d3a"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
            Now
          </h2>
          <p className={bodyTextClass}>
            I'm a Senior Software Engineer with Affirma Consulting, contracted on-site to Meta since
            2021. My current team builds internal apps fast with AI-assisted development — my job is
            applying real engineering judgment on top, so it stays genuinely useful instead of AI
            slop.
          </p>
        </div>

        <div className={sectionClass}>
          <h2 className={sectionHeadClass}>Field notes: experience</h2>
          <div className={timelineClass}>
            {experience.map((item) => (
              <div key={item.role + item.date} className={tlRowClass}>
                <div className={tlDateClass}>{item.date}</div>
                <div className={tlItemClass}>
                  <h3 className={roleClass}>{item.role}</h3>
                  <p className={orgClass}>{item.org}</p>
                  <p className={descClass}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={sectionClass}>
          <h2 className={sectionHeadClass}>Skills</h2>
          <div className={chipRowClass}>
            {skills.map((s) => (
              <span key={s} className={leafChipClass}>
                {s}
              </span>
            ))}
          </div>
        </div>

        <div className={sectionClass}>
          <h2 className={sectionHeadClass}>Personal projects</h2>
          <div className={tagGridClass}>
            {projects.map((p) => (
              <div
                key={p.label}
                className={tagCardClass}
                style={{ transform: `rotate(${p.rotate})` }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  {p.icon}
                </svg>
                <span className={tagLabelClass}>{p.label}</span>
                <span className={tagSubClass}>{p.sub}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={sectionClass}>
          <h2 className={sectionHeadClass}>Off the clock</h2>
          <div className={tagGridClass}>
            {hobbies.map((h) => (
              <div
                key={h.label}
                className={tagCardClass}
                style={{ transform: `rotate(${h.rotate})` }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  {h.icon}
                </svg>
                <span className={tagLabelClass}>{h.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={sectionClass}>
          <h2 className={sectionHeadClass}>Education</h2>
          <p className={bodyTextClass}>
            B.S. Computer Science &amp; B.A. German, University of Arkansas — 2022
          </p>
        </div>

        <div className={footerClass}>
          <div className={footerLinksClass}>
            <a href="mailto:ryanzrau@gmail.com">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <rect
                  x="3"
                  y="5.5"
                  width="18"
                  height="13"
                  rx="2"
                  stroke="#b6603c"
                  strokeWidth="1.8"
                />
                <path
                  d="M4 7l8 6 8-6"
                  stroke="#b6603c"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              ryanzrau@gmail.com
            </a>
            <a href="https://github.com/RyanRau" target="_blank" rel="noreferrer">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 8l-4 4 4 4M15 8l4 4-4 4"
                  stroke="#b6603c"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              github.com/RyanRau
            </a>
            <a href="https://www.linkedin.com/in/ryanzrau/" target="_blank" rel="noreferrer">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <rect
                  x="3"
                  y="4"
                  width="18"
                  height="16"
                  rx="2"
                  stroke="#b6603c"
                  strokeWidth="1.7"
                />
                <circle cx="9" cy="10" r="2.1" stroke="#b6603c" strokeWidth="1.7" />
                <path
                  d="M6 16c.5-2 2-3 3-3s2.5 1 3 3"
                  stroke="#b6603c"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
                <path
                  d="M14 9h4M14 13h4"
                  stroke="#b6603c"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
              LinkedIn
            </a>
          </div>
          <div className={footerNoteClass}>
            Have access to an app here?{" "}
            <button className={footerSignInClass} onClick={onSignIn}>
              Sign in
            </button>
            .
          </div>
        </div>
      </div>
    </div>
  );
}
