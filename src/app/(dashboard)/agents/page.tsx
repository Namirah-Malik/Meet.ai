import { Suspense } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@/trpc/server";
import { AgentsView } from "@/modules/agents/ui/views/agents-view";
import { LoadingState } from "@/components/loading-state";

const Page = async () => {
  const queryClient = getQueryClient();

  // Prefetch the data on the server
  void queryClient.prefetchQuery(trpc.agents.getMany.queryOptions());

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<LoadingState isLoading={true} duration={5000} />}>
        <AgentsView />
      </Suspense>
    </HydrationBoundary>
  );
};

export default Page;