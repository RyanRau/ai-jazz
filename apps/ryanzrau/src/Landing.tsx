import { css } from "goober";

/**
 * The public, signed-out home page. Deliberately outside the bluestar
 * design system (see CLAUDE.md's carve-out for this page) — bluestar is
 * tuned for dashboard UI, and this is a personal/marketing page that wants
 * its own warm, editorial feel instead of the app shell.
 */

const palette = {
  bg: "#fbf3e6",
  bgSoft: "#f4e7d3",
  card: "#fffdf8",
  border: "#e9d9bf",
  text: "#3b2f27",
  muted: "#6f6053",
  terracotta: "#c1613d",
  terracottaDark: "#a54f30",
  green: "#66805a",
  gold: "#c1943f",
};

const pageClass = css`
  min-height: 100vh;
  background:
    radial-gradient(ellipse 900px 500px at 15% -10%, ${palette.bgSoft} 0%, transparent 60%),
    radial-gradient(ellipse 700px 500px at 110% 10%, #eadfc4 0%, transparent 55%), ${palette.bg};
  color: ${palette.text};
  font-family:
    "Inter",
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  line-height: 1.55;
`;

const shellClass = css`
  max-width: 880px;
  margin: 0 auto;
  padding: 32px 24px 96px;
  @media (max-width: 640px) {
    padding: 24px 18px 72px;
  }
`;

const topBarClass = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0 56px;
`;

const wordmarkClass = css`
  font-family: "Fraunces", Georgia, serif;
  font-size: 19px;
  font-weight: 600;
  letter-spacing: 0.01em;
`;

const signInLinkClass = css`
  appearance: none;
  border: 1px solid ${palette.border};
  background: ${palette.card};
  color: ${palette.text};
  font-size: 14px;
  font-family: inherit;
  padding: 8px 16px;
  border-radius: 999px;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    transform 0.15s ease;
  &:hover {
    border-color: ${palette.terracotta};
    transform: translateY(-1px);
  }
`;

const heroClass = css`
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding-bottom: 72px;
`;

const eyebrowClass = css`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${palette.green};
  font-weight: 600;
`;

const h1Class = css`
  font-family: "Fraunces", Georgia, serif;
  font-size: 56px;
  font-weight: 500;
  line-height: 1.05;
  margin: 0;
  @media (max-width: 640px) {
    font-size: 40px;
  }
`;

const heroLeadClass = css`
  max-width: 560px;
  font-size: 19px;
  color: ${palette.muted};
  @media (max-width: 640px) {
    font-size: 17px;
  }
`;

const ctaRowClass = css`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
`;

const ctaPrimaryClass = css`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: ${palette.terracotta};
  color: #fffdf8;
  text-decoration: none;
  font-size: 15px;
  font-weight: 500;
  padding: 12px 22px;
  border-radius: 999px;
  transition:
    background 0.15s ease,
    transform 0.15s ease;
  &:hover {
    background: ${palette.terracottaDark};
    transform: translateY(-1px);
  }
`;

const ctaSecondaryClass = css`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  color: ${palette.text};
  border: 1px solid ${palette.border};
  text-decoration: none;
  font-size: 15px;
  font-weight: 500;
  padding: 12px 22px;
  border-radius: 999px;
  transition:
    border-color 0.15s ease,
    transform 0.15s ease;
  &:hover {
    border-color: ${palette.terracotta};
    transform: translateY(-1px);
  }
`;

const sectionClass = css`
  padding: 56px 0;
  border-top: 1px solid ${palette.border};
`;

const sectionHeadClass = css`
  font-family: "Fraunces", Georgia, serif;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${palette.green};
  margin: 0 0 28px;
`;

const bodyTextClass = css`
  font-size: 17px;
  color: ${palette.muted};
  max-width: 620px;
`;

const timelineClass = css`
  display: flex;
  flex-direction: column;
  gap: 32px;
`;

const timelineItemClass = css`
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 24px;
  padding-left: 20px;
  border-left: 2px solid ${palette.border};
  position: relative;
  &::before {
    content: "";
    position: absolute;
    left: -7px;
    top: 4px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: ${palette.gold};
    border: 2px solid ${palette.bg};
  }
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 6px;
  }
`;

const dateClass = css`
  font-size: 13px;
  color: ${palette.muted};
  letter-spacing: 0.02em;
  padding-top: 3px;
`;

const roleClass = css`
  font-family: "Fraunces", Georgia, serif;
  font-size: 20px;
  font-weight: 500;
  margin: 0 0 4px;
`;

const orgClass = css`
  font-size: 14px;
  color: ${palette.terracotta};
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

const chipClass = css`
  font-size: 14px;
  color: ${palette.text};
  background: ${palette.card};
  border: 1px solid ${palette.border};
  padding: 8px 16px;
  border-radius: 999px;
`;

const hobbyGridClass = css`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  @media (max-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const hobbyCardClass = css`
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  text-align: center;
  background: ${palette.card};
  border: 1px solid ${palette.border};
  border-radius: 18px;
  padding: 24px 12px;
`;

const hobbyIconClass = css`
  font-size: 28px;
`;

const hobbyLabelClass = css`
  font-size: 14px;
  font-weight: 500;
`;

const footerClass = css`
  padding-top: 56px;
  border-top: 1px solid ${palette.border};
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const footerLinksClass = css`
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  font-size: 15px;
  a {
    color: ${palette.terracotta};
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
`;

const footerNoteClass = css`
  font-size: 13px;
  color: ${palette.muted};
`;

const experience = [
  {
    date: "2022 — Present",
    role: "Senior Software Engineer",
    org: "Affirma Consulting, contracted to Meta",
    desc: "Currently on a Data Center team, productionizing prototype apps and building new internal tools fast with AI-assisted development. Before that, spent three years building an internal asset-management platform from scratch that grew to serve nearly 100 teams and tens of thousands of assets — plus a stint mentoring new Affirma engineers onto Meta's stack.",
  },
  {
    date: "2019 — 2022",
    role: "Software Engineer & Intern",
    org: "Affirma Consulting",
    desc: "Started as an intern treated like full-time staff, building an IoT energy-dashboard product in Angular for a client and shipping demos for the Microsoft Graph API. Stuck around post-internship for database migrations and reporting scripts before landing on the Meta contract.",
  },
  {
    date: "2017 — 2021",
    role: "Technology Coordinator",
    org: "University of Arkansas, STEM Education",
    desc: "Built a Django inventory system to replace a paper-and-sticky-notes process for 800+ pieces of loaned equipment, cutting workflow time in half — later presented it at a national UTeach conference.",
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

const hobbies = [
  { icon: "🚵", label: "Gravel biking" },
  { icon: "🏃", label: "Running" },
  { icon: "🧗", label: "Climbing" },
  { icon: "📷", label: "Photography" },
  { icon: "🐕", label: "My golden retriever" },
  { icon: "🌱", label: "Plants" },
];

export function Landing({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className={pageClass}>
      <div className={shellClass}>
        <div className={topBarClass}>
          <span className={wordmarkClass}>Ryan Rau</span>
          <button className={signInLinkClass} onClick={onSignIn}>
            Sign in
          </button>
        </div>

        <div className={heroClass}>
          <div className={eyebrowClass}>
            <span aria-hidden>📍</span> Fayetteville, Arkansas
          </div>
          <h1 className={h1Class}>Software engineer &amp; reverse&#8209;engineer at heart.</h1>
          <p className={heroLeadClass}>
            I like taking things apart to understand how they work, then building something better
            with what I learn. These days that means leading internal tools at Meta by day — and
            chasing gravel roads, climbing routes, and good light by everything else.
          </p>
          <div className={ctaRowClass}>
            <a className={ctaPrimaryClass} href="mailto:ryanzrau@gmail.com">
              Say hello →
            </a>
            <a
              className={ctaSecondaryClass}
              href="https://github.com/RyanRau"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </div>
        </div>

        <div className={sectionClass}>
          <h2 className={sectionHeadClass}>Now</h2>
          <p className={bodyTextClass}>
            I'm a Senior Software Engineer with Affirma Consulting, contracted on-site to Meta since
            2021. My current team builds internal apps fast with AI-assisted development — my job is
            applying real engineering judgment on top, from architecture to what data actually needs
            to be shared across tools, so it stays genuinely useful instead of AI slop.
          </p>
        </div>

        <div className={sectionClass}>
          <h2 className={sectionHeadClass}>Experience</h2>
          <div className={timelineClass}>
            {experience.map((item) => (
              <div key={item.role + item.date} className={timelineItemClass}>
                <div className={dateClass}>{item.date}</div>
                <div>
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
              <span key={s} className={chipClass}>
                {s}
              </span>
            ))}
          </div>
        </div>

        <div className={sectionClass}>
          <h2 className={sectionHeadClass}>Outside of work</h2>
          <div className={hobbyGridClass}>
            {hobbies.map((h) => (
              <div key={h.label} className={hobbyCardClass}>
                <span className={hobbyIconClass} aria-hidden>
                  {h.icon}
                </span>
                <span className={hobbyLabelClass}>{h.label}</span>
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
            <a href="mailto:ryanzrau@gmail.com">ryanzrau@gmail.com</a>
            <a href="https://github.com/RyanRau" target="_blank" rel="noreferrer">
              github.com/RyanRau
            </a>
          </div>
          <div className={footerNoteClass}>
            Have access to an app here?{" "}
            <button
              className={css`
                background: none;
                border: none;
                padding: 0;
                color: ${palette.terracotta};
                cursor: pointer;
                font-size: 13px;
                text-decoration: underline;
                font-family: inherit;
              `}
              onClick={onSignIn}
            >
              Sign in
            </button>
            .
          </div>
        </div>
      </div>
    </div>
  );
}
