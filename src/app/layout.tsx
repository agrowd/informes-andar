export const metadata = {
	title: 'Informes Andar',
	description: 'Sistema de formularios e informes evolutivos',
};

import Nav from './_components/Nav';
import { Providers } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="es">
			<body className="ga-body">
				<link rel="stylesheet" href="/globals.css" />
				<Providers>
					<header className="ga-header">
						<Nav />
					</header>
					<main className="ga-container">{children}</main>
				</Providers>
			</body>
		</html>
	);
}


