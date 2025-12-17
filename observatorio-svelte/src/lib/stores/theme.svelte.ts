export class ThemeStore {
	isDark = $state(true);

	toggle = () => {
		this.isDark = !this.isDark;
	};
}

export const themeStore = new ThemeStore();
