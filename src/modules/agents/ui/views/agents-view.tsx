"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { LoadingState } from "@/components/loading-state";

export const AgentsView = () => {
  const trpc = useTRPC();
  const { data, isLoading, isError } = useQuery(trpc.agents.getMany.queryOptions());

  if (isLoading) {
    return <LoadingState isLoading={true} duration={5000} />;
  }

  if (isError) {
    return (
      <div>
        Error!
      </div>
    );
  }

  return (
    <div>
      {JSON.stringify(data, null, 2)}
    </div>
  );
};