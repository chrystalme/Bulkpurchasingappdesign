import type { Screen } from '../../App';
import { useAuth } from '../../contexts/AuthContext';
import { MemberHome } from './home/MemberHome';
import { VendorHome } from './home/VendorHome';
import { AdminHome } from './home/AdminHome';

interface HomeProps {
  navigate: (screen: Screen, groupId?: string) => void;
}

export function Home({ navigate }: HomeProps) {
  const { user } = useAuth();

  // Route to role-specific home page
  switch (user?.role) {
    case 'vendor':
      return <VendorHome navigate={navigate} />;
    case 'admin':
    case 'superUser':
      return <AdminHome navigate={navigate} />;
    case 'member':
    default:
      return <MemberHome navigate={navigate} />;

  }
}