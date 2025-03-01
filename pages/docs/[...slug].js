import Head from "next/head";
import Container from "@components/container";
import Layout from "@components/layout";
import { useRouter } from "next/router";
import ErrorPage from "next/error";
import { parseISO, format } from "date-fns";
import client, {
  getClient,
  usePreviewSubscription,
  PortableText
} from "@lib/sanity";
import { singlequery, catquery, configQuery } from "@lib/groq";
import parseOutline from "@utils/parseOutline";
import Link from "next/link";

export default function Blog(props) {
  const { postdata, siteconfig, sidebar, preview } = props;
  const router = useRouter();

  // If "postdata" or "siteconfig" is missing, show a 404. We won't do a loading screen.
  if (!postdata || !siteconfig) {
    return <ErrorPage statusCode={404} />;
  }

  // Next.js won't show a fallback page because we use fallback: 'blocking' below,
  // so we don't need a "router.isFallback" check.

  const { slug } = router.query;
  const activeSlug = slug?.slice(-1).pop();

  // Live preview logic
  const { data: post } = usePreviewSubscription(singlequery, {
    params: { slug: activeSlug },
    initialData: postdata,
    enabled: preview || router.query.preview !== undefined
  });

  const { data: siteConfig } = usePreviewSubscription(configQuery, {
    initialData: siteconfig,
    enabled: preview || router.query.preview !== undefined
  });

  // Outline for table of contents
  const outline = post && parseOutline(post.body);

  // Build a flat array of all docs from the sidebar
  const docslist = sidebar?.map(a => a.items).flat();
  const currentPage = docslist?.findIndex(
    a => a.slug.current === activeSlug
  );
  const prevPost = docslist?.[currentPage - 1];
  const nextPost = docslist?.[currentPage + 1];

  return (
    <Layout
      {...siteConfig}
      sidebar={sidebar}
      toc={outline}
      active={activeSlug}
    >
      <Container className="py-10">
        <h1 className="text-4xl font-bold text-gray-800">
          {post.title}
        </h1>

        <div className="mt-4 prose prose-violet prose-a:text-violet-500 max-w-none prose-pre:bg-slate-100 prose-pre:text-slate-700 prose-headings:scroll-m-20">
          {post.body && <PortableText value={post.body} />}
        </div>

        <div className="flex justify-between border-t mt-10 py-5">
          <div>
            {prevPost && (
              <Link
                href={`/docs/${prevPost?.category.slug.current}/${prevPost?.slug.current}`}
              >
                <a className="flex flex-col items-start">
                  <span className="text-sm text-slate-400">
                    Previous
                  </span>
                  <span className="text-violet-500">
                    {prevPost.title}
                  </span>
                </a>
              </Link>
            )}
          </div>

          <div>
            {nextPost && (
              <Link
                href={`/docs/${nextPost?.category.slug.current}/${nextPost?.slug.current}`}
              >
                <a className="flex flex-col items-end">
                  <span className="text-sm text-slate-400">
                    Next
                  </span>
                  <span className="text-violet-500">
                    {nextPost.title}
                  </span>
                </a>
              </Link>
            )}
          </div>
        </div>
      </Container>
    </Layout>
  );
}

export async function getStaticProps({ params, preview = false }) {
  // Use the last part of the slug array as the doc slug
  const docSlug = params.slug.slice(-1).pop();

  // Fetch the single doc
  const post = await getClient(preview).fetch(singlequery, {
    slug: docSlug
  });

  // Fetch sidebar categories/docs
  const sidebar = await getClient(preview).fetch(catquery);

  // Fetch site config
  const config = await getClient(preview).fetch(configQuery);

  return {
    props: {
      postdata: post || null,
      siteconfig: config || null,
      sidebar: sidebar || [],
      preview
    },
    revalidate: 10
  };
}

export async function getStaticPaths() {
  // We provide no paths upfront, letting Next.js generate them on demand
  // but we do NOT show a fallback or loading screen.
  return {
    paths: [],
    fallback: "blocking" // Blocks rendering until data is loaded
  };
}
