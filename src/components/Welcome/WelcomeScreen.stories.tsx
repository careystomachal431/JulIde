import type { Meta, StoryObj } from "@storybook/react";
import { WelcomeScreen } from "./WelcomeScreen";
import { useSettingsStore } from "../../stores/useSettingsStore";

const meta: Meta<typeof WelcomeScreen> = {
  title: "Components/WelcomeScreen",
  component: WelcomeScreen,
  decorators: [
    (Story) => (
      <div style={{ width: "100%", height: "100vh", background: "var(--bg-main, #1e1e2e)" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof WelcomeScreen>;

export const Default: Story = {
  name: "No recent workspaces",
  play: () => {
    useSettingsStore.setState({
      settings: { ...useSettingsStore.getState().settings, recentWorkspaces: [] },
    });
  },
};

export const WithRecentWorkspaces: Story = {
  name: "With recent workspaces",
  play: () => {
    useSettingsStore.setState({
      settings: {
        ...useSettingsStore.getState().settings,
        recentWorkspaces: [
          "/home/user/projects/MyPackage.jl",
          "/home/user/projects/DataAnalysis",
          "/home/user/projects/JuliaML",
        ],
      },
    });
  },
};
