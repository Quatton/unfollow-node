import { config } from 'dotenv';
import { Feed, IgApiClient } from 'instagram-private-api';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

config();

let actions = 0;

const ig = new IgApiClient();

const username = process.env.IG_USERNAME;
const password = process.env.IG_PASSWORD;

export async function unfollow(): Promise<void> {
  ig.state.generateDevice(username);

  const loggedInUser = await ig.account.login(username, password);

  const followersFeed = ig.feed.accountFollowers(loggedInUser.pk);
  const followingsFeed = ig.feed.accountFollowing(loggedInUser.pk);

  const followers = await getAllItemsFromFeed(followersFeed);
  const followings = await getAllItemsFromFeed(followingsFeed);

  console.log('Followers', followers.length);
  console.log('Followings', followings.length);

  const followersUsername = new Set(followers.map(({ username }) => username));
  // Filtering through the ones who aren't following you.
  const notFollowingYou = followings.filter(
    ({ username }) => !followersUsername.has(username),
  );

  processNextUser(0);

  async function getAllItemsFromFeed<T>(feed: Feed<unknown, T>): Promise<T[]> {
    let items = [];
    do {
      items = items.concat(await feed.items());
    } while (feed.isMoreAvailable());
    return items;
  }

  function processNextUser(userIndex: number): void {
    if (userIndex >= notFollowingYou.length) {
      rl.close();
      return;
    }

    const user = notFollowingYou[userIndex];
    console.log(user.username);

    rl.question(
      `Do you want to perform the action for ${user.username}? (y/n) `,
      async (answer) => {
        if (answer.toLowerCase() === 'y') {
          await ig.friendship.destroy(user.pk);
          console.log(`Unfollowed ${user.username} ${++actions}`);
          if (actions === 15) {
            rl.close();
            return;
          }
        } else {
          console.log(`Skipping...`);
        }

        processNextUser(userIndex + 1);
      },
    );
  }
}
