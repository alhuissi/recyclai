
# Recyclai

This is the repository for the Monday.com and Lablab hackaton (June 2023).


## Getting Started

To connect this app to monday, you need to run the development server and create a tunnel to your local environment.

### Run the development server

First, start the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Run the ngrok tunnel

Install ngrok and sign up for an account - https://ngrok.com/download

Then, run the following command: 
```
ngrok http 3000
```

### Connect your app to monday

Create an app in monday and add your ngrok URL as the "Build URL". [Learn more here!](https://developer.monday.com/apps/docs/manage)


## Join the community

[Sign up for the monday community here.](https://community.monday.com)
