# Easy Changelogs

This project is a standalone changelog manager that listens for branch push webhooks from either GitLab or GitHub, saves them in a local SQLite database, and serves a frontend. It's an all-in-one, mostly plug-and-play project powered by Bun.

## Configuration Process

Follow these steps to configure the project:

1. **Install Bun**

   First, you'll need to install Bun, the tool that powers this project. If you haven't already, visit the Bun website for installation instructions:

   [Bun Installation Instructions](https://bun.sh/)

2. **Install Project Dependencies**

   Navigate to your project directory using your terminal. Once inside, execute the following command to install all the necessary dependencies:

   ```bash
   bun install

   ```

3. **Update the Server Configuration**

   Now, let's configure the server to your preferences. Open the `.env` file located in your project directory, and set the port number you want the server to listen on:

   ```plaintext
   PORT=your_chosen_port
   ```

4. **Start the Server**

   With the dependencies installed, you're ready to launch the server. Run the following command in your terminal or command prompt within the project directory:

   ```bash
   bun run start

   ```

5. **Configure Your System**

   It's time to configure your system to ensure secure communication with the changelog manager. Start by visiting your project's root ("/") webpage in your web browser. Append the starting secret "secret" to the URL as a query parameter:

   ```
   https://your_domain.com/?secret=secret
   ```

   Follow the prompts and instructions on the frontend interface to configure your system preferences. Remember to set up a different secret to secure your system.

6. **Configure Your GitLab/GitHub Repo**

   To enable automatic changelog updates, you need to configure your GitLab or GitHub repository to send webhooks on branch pushes. Navigate to your project's settings and locate the webhook settings. Add a new webhook with the following URL:

   ```
   https://your_domain.com/changelog/hook
   ```

   Rather than embedding the secret directly into the URL, both GitLab and GitHub offer a dedicated 'secret' field for webhook configurations. In GitLab, this secret is transmitted via the x-gitlab-token header, while GitHub uses the x-hub-signature-256 header. Simply input the same secret key you configured in your system into the 'secret' field when setting up the webhook.

7. **Create Your First Changelog from a Commit**

   When committing changes, use the following template in your commit message to automatically create changelogs:

   ```
   your_commit_message

   [changelog|1.0.0|release]
   [feature] Lorem ipsum dolor sit amet
   [fix] Lorem ipsum dolor sit amet
   [deprecation] Lorem ipsum dolor sit amet
   [end]
   ```

   Replace `1.0.0` with the target version if your system has `use versioning` enabled. Include `|release` if you intend to release the version being pushed; otherwise, omit it. If versioning is disabled, exclude both `|1.0.0` and `|release`. When `use versioning` is disabled, new changelogs will be automatically be released and sorted by date.

8. **View the Latest Changelog**

   After pushing your first changelog, Visit the `/changelogs` page to see your newest addition:

   ```
   https://your_domain.com/changelogs
   ```

   This page displays the most recent changelog entries, providing a quick overview of the latest updates to your project.

## Frontend Routes Summary

| Route                      | Needs Authentication | Description                                                                                 |
| -------------------------- | -------------------- | ------------------------------------------------------------------------------------------- |
| your_domain.com/           | Yes                  | System configuration page.                                                                  |
| your_domain.com/changelog  | Yes                  | Manually add changelogs and release versions.                                               |
| your_domain.com/changelogs | Yes (optional)       | View all changelogs. Authenticated users can also view unreleased versions and delete logs. |

## Additional Observations

1. If you forget your secret, you can retrieve it from the `secret.txt` file located in the root of your project. Keep this file secure and do not expose it to unauthorized users.
2. Customize your page visuals by editing the HTML files within the `frontend/template` folder. Modify these files to tailor the appearance of your frontend interface according to your preferences.
