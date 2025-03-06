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

  // Derive the slug from the last part of /docs/... path
  const activeSlug = router.query.slug?.slice(-1).pop();

  // usePreviewSubscription is optional, but we'll keep it in case you want Preview Mode
  const { data: post } = usePreviewSubscription(singlequery, {
    params: { slug: activeSlug },
    initialData: postdata,
    enabled: preview || router.query.preview !== undefined
  });

  const { data: siteConfig } = usePreviewSubscription(configQuery, {
    initialData: siteconfig,
    enabled: preview || router.query.preview !== undefined
  });

  // If data is missing, show 404
  if (!post || !siteConfig) {
    return <ErrorPage statusCode={404} />;
  }

  // Outline for table of contents
  const outline = parseOutline(post.body);

  // Flatten the sidebar docs to find previous/next
  const docslist = sidebar?.map(a => a.items).flat() || [];
  const currentPage = docslist.findIndex(
    a => a.slug.current === activeSlug
  );
  const prevPost = docslist[currentPage - 1];
  const nextPost = docslist[currentPage + 1];

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

        <div className="mt-4 prose prose-yellow prose-a:text-yellow-500 max-w-none prose-pre:bg-slate-100 prose-pre:text-slate-700 prose-headings:scroll-m-20">
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
                  <span className="text-yellow-500">
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
                  <span className="text-sm text-slate-400">Next</span>
                  <span className="text-yellow-500">
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

// Replace getStaticProps + getStaticPaths with getServerSideProps:
export async function getServerSideProps({ params, query }) {
  // The doc slug is the last part of /docs/something
  const docSlug = params.slug.slice(-1).pop();

  // Optional: check if preview is requested
  const isPreview = query.preview === "true" || false;

  // Fetch fresh data from Sanity on every request
  const post = await getClient(isPreview).fetch(singlequery, { slug: docSlug });
  const sidebar = await getClient(isPreview).fetch(catquery);
  const config = await getClient(isPreview).fetch(configQuery);

  // If we don't find the doc or config, return 404
  if (!post || !config) {
    return { notFound: true };
  }

  // Return the data as props
  return {
    props: {
      postdata: post,
      siteconfig: config,
      sidebar: sidebar || [],
      preview: isPreview,
    },
  };
}
