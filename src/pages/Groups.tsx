import { PageLayout, PageHeader, PageBody } from '@/components/PageLayout';
import { Users2 } from 'lucide-react';

const Groups = () => {
  return (
    <PageLayout>
      <PageHeader>
        <div className="container max-w-2xl mx-auto px-4 pt-4 pb-2">
          <div className="flex items-center justify-between h-9">
            <h1 className="text-lg sm:text-xl font-semibold">Groups</h1>
          </div>
        </div>
      </PageHeader>

      <PageBody>
        <main className="container max-w-2xl mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center text-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Coming Soon</h2>
            <p className="text-muted-foreground max-w-sm">
              Practice with your community. Groups are on the way!
            </p>
          </div>
        </main>
      </PageBody>
    </PageLayout>
  );
};

export default Groups;
