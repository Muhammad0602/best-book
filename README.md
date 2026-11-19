# Best Book

<a name="readme-top"></a>

<div align="center">

  <h3><b> Best Book README</b></h3>

</div>

# 📗 Table of Contents

- [📖 About the Project](#about-project)
- [🛠 Built With](#built-with)
- [💻 Getting Started](#getting-started)
  - [Setup](#setup)
  - [Prerequisites](#prerequisites)
  - [Install](#install)
  - [Usage](#usage)
  - [Run tests](#run-tests)
  - [Deployment](#triangular_flag_on_post-deployment)
- [👥 Authors](#authors)
- [✏️ Study features](#study-features)
- [🔭 Future Features](#future-features)
- [🤝 Contributing](#contributing)
- [⭐️ Show your support](#support)
- [🙏 Acknowledgements](#acknowledgements)
- [📝 License](#license)

# 📖 React Group Project <a name="about-project"></a>

This project is a Quran application that allows users to view a list of surahs and navigate to a specific surah to view its ayahs. It's a single-page application built using React and React Router, allowing for seamless navigation between pages without having to refresh the browser.

## 🛠 Built With HTML, CSS and JS <a name="built-with"></a>

### Tech Stack <a name="tech-stack"></a>

<details>
  <summary>Client</summary>
  <ul>
    <li><a href="https://code.visualstudio.com/">Visual Studio Code</a></li>
  </ul>
</details>

<details>
  <summary>Server</summary>
  <ul>
    <li><a href="https://github.com/">GitHub</a></li>
  </ul>
</details>

## 🚀 Live Demo <a name="live-demo"></a>

<a href="https://the-best-book-on-earth.onrender.com/">Live</a>

## 🚀Video Walkthrough <a name="live-demo"></a>

<a href="https://www.loom.com/share/4a148e88c7064482b60676e30b3dd4c2">Watch Here</a>

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## 💻 Getting Started <a name="getting-started"></a>

To get a local copy up and running, follow these steps.

### Prerequisites

```
Git
VS Code
Node
```

### Setup

```
cd my-folder
git clone git@github.com/Muhammad0602/best-book.git
cd best-book
```

### Install

```
npm install
```

### Usage

```
npm run build
npm start
```

### Run tests

```
npm test
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## 👥 Authors <a name="authors"></a>

👤 **Muhammad Davlatov**

- GitHub: [@Muhammad0602](https://github.com/Muhammad0602)
- LinkedIn: [LinkedIn](https://www.linkedin.com/in/muhammad-davlatov-6a8536254/)

## ✏️ Study features <a name="study-features"></a>

- **Madinah-style page** – the Arabic text uses the King Fahd Complex *Uthmanic Hafs* font and its matching text (bundled in `src/data/quran`, built with `node scripts/build-quran-text.js`), and the ayahs follow one another like on a page of the mushaf. The whole Arabic text works offline.
- **Mushaf pages** – long surahs are split into the pages of the Madinah mushaf. Turn pages with the buttons, the arrow keys or a sideways swipe.
- **Translations** – off by default; the *Translation* button shows the translation under each ayah. Choose between *The Clear Quran* (Dr. Mustafa Khattab), *Saheeh International* and Muhammad Asad. They are downloaded on demand (jsDelivr `fawazahmed0/quran-api`, quran.com, alquran.cloud); check each publisher's terms before distributing the app widely.
- **Ayah menu** – tap an ayah number to play it, read its tafsir, bookmark it, write a note, copy or share it. Bookmarks and notes are listed on the home page.
- **Recitation** – listen ayah by ayah with a choice of ten reciters (audio from cdn.islamic.network); the page turns and the current ayah is lit as it plays.
- **Search and go to** – search the Arabic text or the chosen translation, or jump to a surah and ayah, a page (1–604) or a juz.
- **Settings** – the *Aa* button: night mode, text size, translation, tafsir, reciter and page-turn direction. Signed-in readers find their settings and last place on every device.
- **Tafsir** – from the ayah menu: Arabic (Ibn Kathir, al-Tabari, al-Qurtubi, al-Baghawi, al-Sa'di, al-Wasit, al-Muyassar) and English (Al-Mukhtasar, Ibn Kathir abridged, Ma'arif al-Qur'an, Al-Jalalayn, Asbab al-Nuzul of al-Wahidi). Sources: the quran.com API and the spa5k/tafsir_api collection on GitHub.

- **Highlights** – choose *Highlight*, then tap a word or drag across words (Arabic or translation). Tap a highlight later to change its colour or remove it; overlapping highlights are removed one at a time.
- **Drawings** – choose *Draw* to mark the text freehand (X, circle, underline, arrow). Pen, eraser, select-and-delete, undo/redo, colours and thickness. Two fingers scroll while drawing.
- **Marks list** – every mark in the current surah, with jump-to-ayah and delete.
- **Auto-save** – every change is saved at once; nothing to press.
- **Installable (PWA)** – "Add to Home Screen" on a phone or tablet. The app and the surahs you have opened are available offline.
- **Accounts (optional)** – with Supabase configured, readers sign in and their marks follow them to every device. Without it, marks are kept on the device.

### How marks are stored

Marks are tied to the text, not to pixels:

- a highlight is `surah + ayah + first word + last word`;
- a drawing is anchored to the nearest word and its points are stored as offsets from that word, measured in word heights, so it stays beside the same word on any screen size.

### Switching on accounts (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste the contents of [`supabase/schema.sql`](./supabase/schema.sql) and run it. This creates the `annotations` table with Row Level Security, so each reader can only read and change their own rows.
3. In **Authentication → URL Configuration**, set the Site URL to the address of the deployed app.
4. Copy the **Project URL** and the **anon / publishable key** (never the `service_role` key) from **Project Settings → API**:
   - for local development, into a `.env.local` file (see [`.env.example`](./.env.example));
   - for the deployed site, into two GitHub repository *variables* named `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` (**Settings → Secrets and variables → Actions → Variables**), then re-run the deploy workflow.

### Deployment

Every push to `dev` runs [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml), which tests, builds and publishes the app to GitHub Pages. In the repository **Settings → Pages**, the source must be set to **GitHub Actions**.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## 🔭 Future Features <a name="future-features"></a>

- **[Creating own design]**
- **[Improving the translation]**
- **[Adding an audio]**

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## 🤝 Contributing <a name="contributing"></a>

Contributions, issues, and feature requests are welcome!

Feel free to check the [issues page](https://github.com/Muhammad0602/best-book/issues).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## ⭐️ Show your support <a name="support"></a>

Leave this project a ⭐️ if you like it.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## 🙏 Acknowledgments <a name="acknowledgements"></a>

- Thanks to Microverse team, for all help and support on this project.
- The original design is made by a creative designer ` Nelson Sakwa on Behance.` You can visit her profile here [Link](https://www.behance.net/sakwadesignstudio)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## 📝 License <a name="license"></a>

This project is [MIT](LICENSE) licensed.

<p align="right">(<a href="#readme-top">back to top</a>)</p>
