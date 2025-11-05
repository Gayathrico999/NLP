# 🧠 Automatic Poll Generation – Frontend Documentation

This frontend is part of a monorepo-based Automatic Poll Generation System developed using React + TypeScript + Vite. It integrates with backend and AI services to allow hosts to create polls (manually or automatically), track participant activity, and display results in real-time.

It allows:
- Hosts to create polls (manually or via voice using AI)
- Students to join and participate in polls
- Real-time leaderboards and analytics
- Secure login/authentication
- Live transcription and AI question generation

📁 Location in monorepo: `apps/frontend/`

---

## 🧰 Tech Stack Used

Only tools/packages **actually used** in this frontend app:

| Tool/Library           | Purpose                                        |
|------------------------|------------------------------------------------|
| **React** + **Vite**   | App framework + lightning-fast dev server      |
| **TypeScript**         | Static type checking                          |
| **Tailwind CSS**       | Utility-first styling                         |
| **React Router DOM**   | Navigation and routing                        |
| **Framer Motion**      | Animations and transitions                    |
| **React Hook Form**    | Form validation and management                |
| **Lucide React**       | Icon library for UI                           |
| **Axios**              | HTTP requests (via `services/`)               |
| **Recharts**           | Chart rendering (analytics, leaderboard)      |
| **jspdf + autotable**  | Exporting poll reports as PDF                 |
| **xlsx**               | for spreadsheet export              |
| **React Hot Toast**    | User notifications                            |
| **PNPM**               | Package manager (used with Turborepo)         |

---

## ⚙️ Setup Instructions

### 🔧 Prerequisites
Ensure the following are installed:
- [Node.js](https://nodejs.org/) (v18+)
- [PNPM](https://pnpm.io/) (recommended for monorepo)
- Git

### 📦 Install Dependencies

1. From the **monorepo root**:
  ```bash
      pnpm install

2. Run Frontend Only
      cd apps/frontend
      pnpm dev

3. Or run all apps:
    pnpm dev

4. 🏗 Build for Production
      pnpm build

5. 🔍 Preview Built App
      pnpm preview

🗂️ Folder & Component Structure

🔹 src/pages/

| File                     | Description                                           |
| ------------------------ | ----------------------------------------------------- |
| `LoginPage.tsx`          | Auth page to log into system                          |
| `RegisterPage.tsx`       | Register new users                                    |
| `ForgotPasswordPage.tsx` | Reset password UI                                     |
| `HomePage.tsx`           | Welcome screen to choose "Create Poll" or "Join Poll" |
| `CreatePollPage.tsx`     | Choose between Manual or AI-based Poll                |
| `CreateManualPoll.tsx`   | Form to add questions, options, correct answer        |
| `AIQuestionFeed.tsx`     | Displays AI-generated questions for approval          |
| `AudioCapture.tsx`       | Host can speak – audio is sent to Whisper backend     |
| `HostDashboard.tsx`      | View created polls, track sessions                    |
| `StudentDashboard.tsx`   | View available polls, join sessions                   |
| `PollQuestionsPage.tsx`  | Display poll questions for student answering          |
| `Leaderboard.tsx`        | Shows live leaderboard after quiz                     |
| `Participants.tsx`       | Track who joined poll session                         |
| `Reports.tsx`            | Generate PDF reports using `jspdf`                    |
| `Settings.tsx`           | Change profile/password                               |
| `ContactUs.tsx`          | Static contact info                                   |
| `NotFound.tsx`           | 404 error fallback page                               |

🔹 src/components/

| File/Folder                          | Description                                                              |
| ------------------------------------ | ------------------------------------------------------------------------ |
| `controls/`                          | Includes sliders, selectors for poll config                              |
| `student/`                           | Student-specific UI blocks like `QuickAccessCards`, `StudentProfilePage` |
| `host/GuestLinkGenerator.tsx`        | Generates shareable poll link                                            |
| `Sidebar.tsx` & `StudentSidebar.tsx` | App navigation layout                                                    |
| `DashboardLayout.tsx`                | Reusable wrapper layout with sidebar                                     |
| `GlassCard.tsx`                      | Frosted UI container                                                     |
| `AuthGuard.tsx`                      | Route-level protection based on auth state                               |
| `LoadingScreen.tsx`                  | Full-screen spinner during loading                                       |

🔹 src/contexts/

| Context              | Use                                    |
| -------------------- | -------------------------------------- |
| `AuthContext.tsx`    | Global login token and user context    |
| `ThemeContext.tsx`   | Toggle dark/light mode                 |
| `LoadingContext.tsx` | Manage loading state for buttons/pages |

🔹 src/hooks/

| Hook                   | Use                                      |
| ---------------------- | ---------------------------------------- |
| `useCopyProtection.ts` | Prevents users from copying poll content |

🔹 src/transcription/

| Component                        | Use                                        |
| -------------------------------- | ------------------------------------------ |
| `GuestRecorder.tsx`              | Recorder for guests                        |
| `HostMicControls.tsx`            | Audio recorder for hosts                   |
| `LiveTranscriptFeed.tsx`         | Show real-time speech-to-text from Whisper |
| `micManager.ts`, `wavEncoder.ts` | Mic and audio processing logic             |


🔁 Workflow Summary

1. Any one can login after regisstration.
2. If User wants to create poll (act as host)
    (i)  First he creates poll session by generating room code and user sends invites with that room code to his/her students through Emails.
    (ii) user Can choose either: (for generating polls)
      
        Create manually (by using manuall poll page)
        and live streaming Audio/voice → send to Whisper → generate with LLM/Gemini API

3. Poll shared to students.

4. Students join using poll code → see PollQuestionsPage.

5. On submit → backend evaluates → leaderboard & analytics generated

6. Host downloads reports using jspdf

🧪 Testing
Feature	Status
Login/Auth	✅ Complete
UI Responsiveness	✅ Fully responsive
Backend API Integration	✅ Done
Leaderboard	✅ Working
PDF Export	✅ via jspdf
